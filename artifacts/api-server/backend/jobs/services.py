from accounts.models import User
from accounts.security import Conflict, lock_accounts
from accounts.services import actor_locked
from django.core.exceptions import ValidationError as ModelValidationError
from django.db import IntegrityError, transaction
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from .models import JobEvent, ProductionJob
from .policy import (
    TRANSITIONS,
    capabilities,
    require_creator,
    require_recorder,
    visible_jobs,
)


def snapshot(job):
    from .card import data
    return {**{field: getattr(job, field) for field in ("title", "notes", "status", "reference", "machine")}, "card": data(job)}


def record_event(job, actor, old=None):
    JobEvent.objects.create(
        job=job, actor=actor, revision=job.revision,
        event_type="updated" if old is not None else "created",
        **{f"old_{key}": value for key, value in (old or {}).items()},
        **{f"new_{key}": value for key, value in snapshot(job).items()},
    )


def ready_actor(request):
    # Same ordering as account mutations: lock, then re-read identity/session.
    lock_accounts()
    actor = actor_locked(request)
    if actor.must_change_password:
        raise PermissionDenied(code="password_change_required")
    return actor


def validate(job):
    try:
        job.full_clean()
    except ModelValidationError:
        raise ValidationError("Invalid job fields.") from None


def create_job(request, values):
    try:
        with transaction.atomic():
            actor = ready_actor(request)
            require_creator(actor)
            job = ProductionJob(created_by=actor, **values)
            validate(job)
            job.save()
            record_event(job, actor)
            return job, actor
    except IntegrityError:
        raise Conflict(code="job_conflict") from None


@transaction.atomic
def update_job(request, pk, values):
    actor = ready_actor(request)
    try:
        job = visible_jobs(actor).select_for_update(of=("self",)).get(pk=pk)
    except ProductionJob.DoesNotExist:
        raise NotFound() from None
    allowed = capabilities(actor, job)
    # Do not disclose mutable state to actors with no update permission.
    require_recorder(actor)
    if job.status in ("cancelled", "completed"):
        raise Conflict(code="job_closed")
    if values["revision"] != job.revision:
        raise Conflict(code="stale_revision")
    for field in ("title", "notes", "reference", "machine"):
        if field in values and not allowed[f"edit_{field}"]:
            raise PermissionDenied()
    from .card import FIELDS
    if any(field in values for field in FIELDS) and not allowed["edit_card"]:
        raise PermissionDenied()
    # Selecting a configured machine is production recording, not catalogue management.
    if ("machine" in values and actor.role != User.Role.MANAGER and
            (not values["machine"] or not ProductionJob.objects.filter(machine=values["machine"]).exists())):
        raise PermissionDenied()
    if "status" in values:
        status = values["status"]
        if status not in TRANSITIONS[job.status]:
            error = ValidationError("Invalid status transition.")
            # Handled as a stable domain error by the existing exception handler.
            error.public_code = "invalid_transition"
            raise error
        if status not in allowed["transitions"]:
            raise PermissionDenied()
    before = snapshot(job)
    for field in ("title", "notes", "status", "reference", "machine", *FIELDS):
        if field in values:
            setattr(job, field, values[field])
    if values.get("status") == "completed":
        from materials.services import closing
        eligibility = closing(job, completing=True)
        if not eligibility["can_close"]:
            error = ValidationError("Job cannot be completed.")
            error.public_code = eligibility["reason"]
            raise error
    if snapshot(job) != before:
        job.revision += 1
        validate(job)
        job.save()
        record_event(job, actor, before)
    return job, actor
