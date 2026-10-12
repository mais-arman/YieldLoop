import uuid

from audit.models import AppendOnlyQuerySet
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Lower


def job_number():
    return f"YL-{uuid.uuid4().hex[:12].upper()}"


class ProductionJob(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        OPEN = "open", "Open / In progress"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    job_number = models.CharField(max_length=15, unique=True, default=job_number, editable=False)
    title = models.CharField(max_length=200)
    reference = models.CharField(max_length=120, blank=True, default="")
    machine = models.CharField(max_length=120, blank=True, default="")
    is_demo = models.BooleanField(default=False)
    notes = models.CharField(max_length=5000, blank=True, default="")
    product_specification = models.CharField(max_length=5000, blank=True, default="")
    sheet_width = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    sheet_height = models.DecimalField(max_digits=12, decimal_places=3, null=True, blank=True)
    sheet_unit = models.CharField(max_length=2, choices=[("mm", "mm"), ("cm", "cm"), ("in", "in")], blank=True, default="")
    planned_yield = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)
    cutting_instructions = models.CharField(max_length=5000, blank=True, default="")
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
            models.CheckConstraint(condition=(
                models.Q(sheet_width__isnull=True, sheet_height__isnull=True, sheet_unit="")
                | models.Q(sheet_width__isnull=False, sheet_height__isnull=False, sheet_width__gt=0, sheet_height__gt=0, sheet_unit__in=["mm", "cm", "in"])
            ), name="job_sheet_complete_positive"),
            models.CheckConstraint(condition=(
                models.Q(planned_yield__isnull=True)
                | models.Q(planned_yield__isnull=False, planned_yield__gte=0, planned_yield__lte=100)
            ), name="job_planned_yield_range"),
            models.CheckConstraint(condition=models.Q(status__in=["draft", "open", "cancelled", "completed"]), name="job_valid_status"),
            models.UniqueConstraint(Lower("reference"), condition=~models.Q(reference=""), name="job_reference_unique"),
            models.CheckConstraint(condition=~models.Q(status="completed") | models.Q(machine__regex=r"\S"), name="completed_job_has_machine"),
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
    old_card = models.JSONField(null=True, blank=True)
    new_card = models.JSONField(null=True, blank=True)
    old_title = models.CharField(max_length=200, null=True, blank=True)
    old_reference = models.CharField(max_length=120, null=True, blank=True)
    new_reference = models.CharField(max_length=120, blank=True, default="")
    old_machine = models.CharField(max_length=120, null=True, blank=True)
    new_machine = models.CharField(max_length=120, blank=True, default="")
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
            models.CheckConstraint(condition=models.Q(new_status__in=["draft", "open", "cancelled", "completed"]), name="job_event_status"),
        )

    def save(self, *args, **kwargs):
        if not self._state.adding or kwargs.get("force_update") or kwargs.get("update_fields"):
            raise ValidationError("Audit events cannot be updated.")
        self.full_clean()
        kwargs["force_insert"] = True
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit events cannot be deleted.")
