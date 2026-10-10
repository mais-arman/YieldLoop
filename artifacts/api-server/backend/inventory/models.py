from django.conf import settings
from django.db import models
from materials.models import ImmutableRecord


class OffcutLot(ImmutableRecord):
    """One whole recorded output; never an inferred physical piece or fit."""
    source = models.OneToOneField("materials.MaterialEntry", on_delete=models.PROTECT, related_name="inventory_lot")
    reconciliation = models.OneToOneField("materials.Reconciliation", on_delete=models.PROTECT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    request_id = models.UUIDField(unique=True)

    class Meta:
        ordering = ("-pk",)


class InventoryEvent(ImmutableRecord):
    lot = models.ForeignKey(OffcutLot, on_delete=models.PROTECT, related_name="events")
    action = models.CharField(max_length=16, choices=[("addition", "Addition"), ("void", "Void")])
    reason = models.CharField(max_length=1000)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    request_id = models.UUIDField(unique=True)

    class Meta:
        ordering = ("pk",)
        constraints = (
            models.UniqueConstraint(fields=["lot", "action"], name="inventory_one_action"),
            models.CheckConstraint(condition=models.Q(action__in=["addition", "void"]), name="inventory_valid_action"),
            models.CheckConstraint(condition=models.Q(reason__regex=r"\S"), name="inventory_reason_required"),
        )
