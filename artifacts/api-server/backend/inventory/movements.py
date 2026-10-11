"""Serialized stock ledger; consumption is also a traced receiving-job issue."""
from decimal import Decimal

from accounts.security import Conflict
from django.core.exceptions import ValidationError as ModelValidationError
from django.db import IntegrityError, transaction
from jobs.models import ProductionJob
from jobs.policy import require_editor
from jobs.services import ready_actor
from materials.accounting import calculate
from materials.models import MaterialEntry, Reconciliation
from materials.services import latest
from rest_framework.exceptions import NotFound

from .models import OffcutLot, StockMovement


def balances(lot):
    reserved = {}
    consumed = Decimal(0)
    moved = False
    for row in lot.movements.all():
        moved = True
        reserved.setdefault(row.job_id, Decimal(0))
        reserved[row.job_id] += row.quantity if row.action == "reserve" else -row.quantity
        if row.action == "consume":
            consumed += row.quantity
    remaining = lot.source.quantity - consumed
    return {"remaining": remaining, "reserved": sum(reserved.values(), Decimal(0)),
            "available": remaining - sum(reserved.values(), Decimal(0)), "jobs": reserved, "moved": moved}


def movement_data(row):
    return {"id": row.pk, "action": row.action, "quantity": format(row.quantity, ".3f"),
            "job_id": row.job_id, "issue_entry_id": row.issue_id, "reason": row.reason,
            "actor": row.actor.username, "created_at": row.created_at.isoformat()}


def move(request, pk, action, values):
    from .services import lot_data, lots
    try:
        with transaction.atomic():
            actor = ready_actor(request)
            require_editor(actor)
            try:
                initial = lots(actor).get(pk=pk)
            except OffcutLot.DoesNotExist:
                raise NotFound() from None
            # Stable job lock order, then lot; matches source corrections/voids.
            ids = sorted({initial.source.job_id, values["job_id"]})
            locked = {j.pk: j for j in ProductionJob.objects.select_for_update().filter(pk__in=ids).order_by("pk")}
            job = locked.get(values["job_id"])
            if not job:
                raise NotFound()
            OffcutLot.objects.select_for_update().get(pk=pk)
            lot = lots(actor).get(pk=pk)
            if lot.is_void or hasattr(lot.source, "void"):
                raise Conflict(code="invalid_offcut_source")
            if job.pk == lot.source.job_id:
                raise Conflict(code="same_source_job")
            # Release remains possible after destination cancellation/closure.
            if action != "release" and (job.status != "open" or locked[lot.source.job_id].status == "cancelled"):
                raise Conflict(code="job_not_open")
            if values["revision"] != lot.events.count() + lot.movements.count():
                raise Conflict(code="stale_revision")
            snapshot = latest(job)
            if action != "release" and snapshot and snapshot.material_id != lot.source.material_id:
                raise Conflict(code="material_mismatch")
            stock = balances(lot)
            limit = stock["available"] if action == "reserve" else stock["jobs"].get(job.pk, Decimal(0))
            if values["quantity"] > limit:
                raise Conflict(code="stock_exceeded")
            issue = None
            if action == "consume":
                issue = MaterialEntry.objects.create(
                    job=job, material=lot.source.material, kind="issue", quantity=values["quantity"],
                    unit=lot.source.unit, note=values["reason"], request_id=values["request_id"], created_by=actor)
                Reconciliation.objects.create(
                    job=job, material=lot.source.material, revision=(snapshot.revision if snapshot else 0) + 1,
                    entry=issue, action="record", actor=actor,
                    **calculate(MaterialEntry.objects.filter(job=job, void__isnull=True), lot.source.material_id))
            StockMovement.objects.create(lot=lot, job=job, action=action, quantity=values["quantity"],
                                         reason=values["reason"], actor=actor, request_id=values["request_id"], issue=issue)
            return lot_data(lots(actor).get(pk=pk), actor)
    except (IntegrityError, ModelValidationError):
        raise Conflict(code="inventory_conflict") from None
