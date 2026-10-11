from django.conf import settings
from django.db import models
from materials.models import ImmutableRecord


class CuttingPlan(models.Model):
    job = models.ForeignKey("jobs.ProductionJob", on_delete=models.PROTECT, related_name="cutting_plans")
    name = models.CharField(max_length=160)
    revision = models.PositiveIntegerField(default=1)
    scenarios = models.JSONField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-pk",)
        constraints = (
            models.CheckConstraint(condition=models.Q(revision__gte=1), name="cutting_positive_revision"),
            models.CheckConstraint(condition=models.Q(name__regex=r"\S"), name="cutting_name_required"),
        )


class PlanRevision(ImmutableRecord):
    plan = models.ForeignKey(CuttingPlan, on_delete=models.PROTECT, related_name="history")
    revision = models.PositiveIntegerField()
    name = models.CharField(max_length=160)
    scenarios = models.JSONField()
    reason = models.CharField(max_length=1000)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    request_id = models.UUIDField(unique=True)

    class Meta:
        ordering = ("-revision",)
        constraints = (
            models.UniqueConstraint(fields=["plan", "revision"], name="cutting_unique_revision"),
            models.CheckConstraint(condition=models.Q(reason__regex=r"\S"), name="cutting_reason_required"),
        )
