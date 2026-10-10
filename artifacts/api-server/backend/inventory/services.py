from accounts.models import User
from accounts.security import Conflict
from django.core.exceptions import ValidationError as ModelValidationError
from django.db import IntegrityError, transaction
from django.db.models import Exists, OuterRef
from jobs.policy import require_editor
from jobs.services import ready_actor
from materials.models import MaterialEntry, Reconciliation
from materials.services import visible_job
from rest_framework.exceptions import NotFound

from .models import InventoryEvent, OffcutLot


def lots(actor):
    qs = OffcutLot.objects.select_related("source__job", "source__material", "source__void", "created_by")
    qs = qs.annotate(is_void=Exists(InventoryEvent.objects.filter(lot_id=OuterRef("pk"), action="void")))
    if actor.role == User.Role.CUTTING_OPERATOR:
        qs = qs.filter(source__job__status="open")
    return qs


def lot_data(lot, actor):
    source = lot.source
    voided = lot.is_void
    eligible = not voided and source.job.status == "open" and not hasattr(source, "void")
    return {
        "id": lot.pk, "source_job_id": source.job_id, "source_job_number": source.job.job_number,
        "source_entry_id": source.pk, "reconciliation_id": lot.reconciliation_id,
        "material_id": source.material_id, "material_name": source.material.name,
        "specification": source.material.specification, "quantity": format(source.quantity, ".3f"),
        "remaining": "0.000" if voided else format(source.quantity, ".3f"), "unit": "kg",
        "state": "voided" if voided else "available", "revision": 2 if voided else 1,
        "source_status": source.job.status, "source_voided": hasattr(source, "void"),
        "compatibility": "unverified", "reuse_blocked_reason": "policy_not_defined",
        "created_at": lot.created_at.isoformat(),
        "permissions": {"void": eligible and actor.role in (User.Role.MANAGER, User.Role.PRODUCTION_SUPERVISOR),
                        "reserve": False, "consume": False},
    }


def event_data(event):
    return {"id": event.pk, "action": event.action, "reason": event.reason,
            "actor": event.actor.username, "created_at": event.created_at.isoformat()}


def register(request, data):
    try:
        with transaction.atomic():
            actor = ready_actor(request)
            require_editor(actor)
            job = visible_job(actor, data["job_id"], lock=True)
            if job.status != "open":
                raise Conflict(code="job_not_open")
            try:
                source = MaterialEntry.objects.select_related("void").get(pk=data["source_entry_id"], job=job)
            except MaterialEntry.DoesNotExist:
                raise NotFound() from None
            if source.kind != "offcut" or hasattr(source, "void"):
                raise Conflict(code="invalid_offcut_source")
            if OffcutLot.objects.filter(source=source).exists():
                raise Conflict(code="already_registered")
            snapshot = Reconciliation.objects.filter(entry=source, action="record", job=job).first()
            if snapshot is None:
                raise Conflict(code="invalid_offcut_source")
            lot = OffcutLot.objects.create(source=source, reconciliation=snapshot, created_by=actor, request_id=data["request_id"])
            InventoryEvent.objects.create(lot=lot, action="addition", actor=actor, reason=data["reason"], request_id=data["request_id"])
            return lot_data(lots(actor).get(pk=lot.pk), actor)
    except (IntegrityError, ModelValidationError):
        raise Conflict(code="inventory_conflict") from None


def void_lot(request, pk, data):
    try:
        with transaction.atomic():
            actor = ready_actor(request)
            require_editor(actor)
            try:
                lot = lots(actor).get(pk=pk)
            except OffcutLot.DoesNotExist:
                raise NotFound() from None
            job = visible_job(actor, lot.source.job_id, lock=True)
            if job.status != "open":
                raise Conflict(code="job_not_open")
            if lot.is_void or data["revision"] != 1:
                raise Conflict(code="stale_revision")
            InventoryEvent.objects.create(lot=lot, action="void", actor=actor, reason=data["reason"], request_id=data["request_id"])
            return lot_data(lots(actor).get(pk=pk), actor)
    except (IntegrityError, ModelValidationError):
        raise Conflict(code="inventory_conflict") from None
