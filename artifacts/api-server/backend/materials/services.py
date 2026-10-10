from accounts.models import User
from accounts.security import Conflict
from django.core.exceptions import ValidationError as ModelValidationError
from django.core.paginator import EmptyPage, Paginator
from django.db import IntegrityError, transaction
from jobs.models import ProductionJob
from jobs.policy import require_creator, require_editor, visible_jobs
from jobs.services import ready_actor
from rest_framework.exceptions import NotFound, ValidationError

from .accounting import calculate
from .models import Material, MaterialEntry, MaterialVoid, Reconciliation
from .serializers import entry_data, material_data


def domain_error(code):
    error = ValidationError("Invalid material operation.")
    error.public_code = code
    raise error


def paginate(queryset, values, serialize):
    paginator = Paginator(queryset, values["page_size"])
    try:
        page = paginator.page(values["page"])
    except EmptyPage:
        raise NotFound() from None
    return {
        "count": paginator.count, "page": page.number, "page_size": values["page_size"],
        "total_pages": paginator.num_pages, "results": [serialize(row) for row in page],
    }


def latest(job):
    return Reconciliation.objects.filter(job=job).select_related("material").first()


def visible_job(actor, pk, lock=False):
    queryset = visible_jobs(actor)
    if lock:
        queryset = queryset.select_for_update(of=("self",))
    try:
        return queryset.get(pk=pk)
    except ProductionJob.DoesNotExist:
        raise NotFound() from None


def state(job, actor, values=None):
    snapshot = latest(job)
    entries = MaterialEntry.objects.filter(job=job).select_related("created_by", "void__created_by")
    summary = None
    if snapshot:
        summary = {
            key: format(getattr(snapshot, key), ".3f") if getattr(snapshot, key) is not None else None
            for key in ("issued", "good", "scrap", "offcut", "accounted", "variance", "yield_rate", "scrap_rate")
        }
        summary["created_at"] = snapshot.created_at.isoformat()
    return {
        "job_id": job.pk, "job_revision": job.revision,
        "revision": snapshot.revision if snapshot else 0,
        "material": material_data(snapshot.material) if snapshot else None,
        "summary": summary,
        "permissions": {
            "record": job.status == "open" and actor.role in (User.Role.MANAGER, User.Role.PRODUCTION_SUPERVISOR),
            "manage_materials": actor.role == User.Role.MANAGER,
        },
        "entries": paginate(entries, values or {"page": 1, "page_size": 20}, entry_data),
    }


def create_material(request, values):
    try:
        with transaction.atomic():
            actor = ready_actor(request)
            require_creator(actor)
            return Material.objects.create(created_by=actor, **values)
    except (IntegrityError, ModelValidationError):
        raise Conflict(code="material_conflict") from None


def mutate(request, pk, values, entry_id=None):
    try:
        with transaction.atomic():
            actor = ready_actor(request)
            job = visible_job(actor, pk, lock=True)
            require_editor(actor)
            if job.status != "open":
                raise Conflict(code="job_not_open")
            before = latest(job)
            revision = before.revision if before else 0
            if values["revision"] != revision or values["job_revision"] != job.revision:
                raise Conflict(code="stale_revision")
            if entry_id is None:
                try:
                    material = Material.objects.get(pk=values["material_id"])
                except Material.DoesNotExist:
                    raise NotFound() from None
                if before and before.material_id != material.pk:
                    domain_error("material_mismatch")
                if material.unit != values["unit"]:
                    domain_error("unit_mismatch")
                if before is None and values["kind"] != "issue":
                    domain_error("issue_required")
                if MaterialEntry.objects.filter(job=job, request_id=values["request_id"]).exists():
                    raise Conflict(code="duplicate_record")
                entry = MaterialEntry.objects.create(
                    job=job, material=material, created_by=actor,
                    **{key: values[key] for key in ("kind", "quantity", "unit", "note", "request_id")},
                )
            else:
                try:
                    entry = MaterialEntry.objects.get(pk=entry_id, job=job)
                except MaterialEntry.DoesNotExist:
                    raise NotFound() from None
                if MaterialVoid.objects.filter(entry=entry).exists():
                    raise Conflict(code="already_voided")
                MaterialVoid.objects.create(entry=entry, reason=values["reason"], created_by=actor)
                material = entry.material
            inputs = MaterialEntry.objects.filter(job=job, void__isnull=True)
            Reconciliation.objects.create(
                job=job, material=material, revision=revision + 1, entry=entry,
                action="void" if entry_id is not None else "record", actor=actor,
                **calculate(inputs, material.pk),
            )
            return state(job, actor)
    except (IntegrityError, ModelValidationError):
        raise Conflict(code="material_record_conflict") from None
