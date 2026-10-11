"""Phase 4: immutable kg records and persisted per-job reconciliation revisions."""
import uuid

from audit.models import AppendOnlyQuerySet
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Lower


class ImmutableRecord(models.Model):
    objects = AppendOnlyQuerySet.as_manager()

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self._state.adding or kwargs.get("force_update") or kwargs.get("update_fields"):
            raise ValidationError("Recorded values are immutable.")
        self.full_clean()
        kwargs["force_insert"] = True
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Recorded values cannot be deleted.")


class Material(ImmutableRecord):
    name = models.CharField(max_length=160)
    specification = models.CharField(max_length=500)
    unit = models.CharField(max_length=2, default="kg")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("name", "pk")
        constraints = (
            models.UniqueConstraint(Lower("name"), Lower("specification"), name="material_identity_unique"),
            models.CheckConstraint(condition=models.Q(unit="kg"), name="material_kg_only"),
            models.CheckConstraint(condition=models.Q(name__regex=r"\S"), name="material_nonblank_name"),
            models.CheckConstraint(condition=models.Q(specification__regex=r"\S"), name="material_nonblank_spec"),
        )


class MaterialEntry(ImmutableRecord):
    class Kind(models.TextChoices):
        ISSUE = "issue", "Actual issued"
        GOOD = "good", "Good output"
        SCRAP = "scrap", "Scrap"
        OFFCUT = "offcut", "Reusable offcuts"
        REWORK = "rework", "Pending rework"

    job = models.ForeignKey("jobs.ProductionJob", on_delete=models.PROTECT, related_name="material_entries")
    material = models.ForeignKey(Material, on_delete=models.PROTECT)
    kind = models.CharField(max_length=8, choices=Kind.choices)
    # Max 999,999,999,999.999 kg; never silently round fractional precision.
    quantity = models.DecimalField(max_digits=15, decimal_places=3)
    unit = models.CharField(max_length=2)
    note = models.CharField(max_length=1000, blank=True, default="")
    scrap_reason = models.CharField(max_length=160, blank=True, default="")
    request_id = models.UUIDField(default=uuid.uuid4)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-pk",)
        constraints = (
            models.UniqueConstraint(fields=["job", "request_id"], name="entry_request_unique"),
            models.CheckConstraint(condition=models.Q(quantity__gt=0), name="entry_positive_qty"),
            models.CheckConstraint(condition=models.Q(unit="kg"), name="entry_kg_only"),
            models.CheckConstraint(condition=models.Q(kind__in=["issue", "good", "scrap", "offcut", "rework"]), name="entry_valid_kind"),
            models.CheckConstraint(condition=models.Q(kind="scrap") | models.Q(scrap_reason=""), name="entry_scrap_reason_kind"),
        )

    def clean(self):
        if self.material_id and self.unit != self.material.unit:
            raise ValidationError("Incompatible material unit.")


class MaterialVoid(ImmutableRecord):
    entry = models.OneToOneField(MaterialEntry, on_delete=models.PROTECT, related_name="void")
    reason = models.CharField(max_length=1000)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = (
            models.CheckConstraint(condition=models.Q(reason__regex=r"\S"), name="void_nonblank_reason"),
        )


class Reconciliation(ImmutableRecord):
    """Also the typed audit event: every committed add/void has one snapshot."""
    job = models.ForeignKey("jobs.ProductionJob", on_delete=models.PROTECT, related_name="reconciliations")
    material = models.ForeignKey(Material, on_delete=models.PROTECT)
    revision = models.PositiveIntegerField()
    entry = models.ForeignKey(MaterialEntry, on_delete=models.PROTECT)
    action = models.CharField(max_length=8, choices=[("record", "Record"), ("void", "Void")])
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    issued = models.DecimalField(max_digits=24, decimal_places=3)
    good = models.DecimalField(max_digits=24, decimal_places=3)
    scrap = models.DecimalField(max_digits=24, decimal_places=3)
    offcut = models.DecimalField(max_digits=24, decimal_places=3)
    pending_rework = models.DecimalField(max_digits=24, decimal_places=3, default=0)
    accounted = models.DecimalField(max_digits=24, decimal_places=3)
    variance = models.DecimalField(max_digits=24, decimal_places=3)
    yield_rate = models.DecimalField(max_digits=28, decimal_places=3, null=True, blank=True)
    scrap_rate = models.DecimalField(max_digits=28, decimal_places=3, null=True, blank=True)

    class Meta:
        ordering = ("-revision",)
        constraints = (
            models.UniqueConstraint(fields=["job", "revision"], name="reconciliation_revision_unique"),
            models.CheckConstraint(condition=models.Q(revision__gte=1), name="reconciliation_positive_revision"),
            models.CheckConstraint(condition=models.Q(action__in=["record", "void"]), name="reconciliation_action"),
            models.CheckConstraint(condition=models.Q(pending_rework__gte=0), name="reconciliation_pending_nonnegative"),
            models.CheckConstraint(condition=models.Q(accounted=models.F("good") + models.F("scrap") + models.F("offcut") + models.F("pending_rework")), name="reconciliation_accounted"),
            models.CheckConstraint(condition=models.Q(variance=models.F("issued") - models.F("accounted")), name="reconciliation_variance"),
        )


class ReworkResolution(ImmutableRecord):
    """An output consumes pending disposition; voiding output restores pending."""
    source = models.ForeignKey(MaterialEntry, on_delete=models.PROTECT, related_name="resolutions")
    output = models.OneToOneField(MaterialEntry, on_delete=models.PROTECT, related_name="rework_resolution")
