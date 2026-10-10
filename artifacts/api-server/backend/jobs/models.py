import uuid

from audit.models import AppendOnlyQuerySet
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


def job_number():
    return f"YL-{uuid.uuid4().hex[:12].upper()}"


class ProductionJob(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        OPEN = "open", "Open / In progress"
        CANCELLED = "cancelled", "Cancelled"

    job_number = models.CharField(max_length=15, unique=True, default=job_number, editable=False)
    title = models.CharField(max_length=200)
    notes = models.CharField(max_length=5000, blank=True, default="")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    revision = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("-created_at", "-pk")
        indexes = (
            models.Index(fields=["status", "-created_at", "-id"], name="job_status_created"),
            models.Index(fields=["-created_at", "-id"], name="job_created"),
        )
        constraints = (
            models.CheckConstraint(condition=models.Q(status__in=["draft", "open", "cancelled"]), name="job_valid_status"),
            models.CheckConstraint(condition=models.Q(title__regex=r"\S"), name="job_nonblank_title"),
            models.CheckConstraint(condition=models.Q(revision__gte=1), name="job_positive_revision"),
            models.CheckConstraint(condition=models.Q(job_number__regex=r"^YL-[0-9A-F]{12}$"), name="job_number_format"),
        )


class JobEvent(models.Model):
    """Append-only, typed business snapshots, never arbitrary request payloads."""

    job = models.ForeignKey(ProductionJob, on_delete=models.PROTECT, related_name="events")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    occurred_at = models.DateTimeField(auto_now_add=True)
    request_id = models.UUIDField(default=uuid.uuid4)
    event_type = models.CharField(max_length=8, choices=[("created", "Created"), ("updated", "Updated")])
    revision = models.PositiveIntegerField()
    old_title = models.CharField(max_length=200, null=True, blank=True)
    new_title = models.CharField(max_length=200)
    old_notes = models.CharField(max_length=5000, null=True, blank=True)
    new_notes = models.CharField(max_length=5000, blank=True)
    old_status = models.CharField(max_length=12, choices=ProductionJob.Status.choices, null=True, blank=True)
    new_status = models.CharField(max_length=12, choices=ProductionJob.Status.choices)
    objects = AppendOnlyQuerySet.as_manager()

    class Meta:
        ordering = ("-occurred_at", "-pk")
        constraints = (
            models.UniqueConstraint(fields=["job", "revision"], name="job_event_revision_unique"),
            models.CheckConstraint(condition=models.Q(event_type__in=["created", "updated"]), name="job_event_type"),
            models.CheckConstraint(condition=models.Q(new_status__in=["draft", "open", "cancelled"]), name="job_event_status"),
        )

    def save(self, *args, **kwargs):
        if not self._state.adding or kwargs.get("force_update") or kwargs.get("update_fields"):
            raise ValidationError("Audit events cannot be updated.")
        self.full_clean()
        kwargs["force_insert"] = True
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit events cannot be deleted.")
