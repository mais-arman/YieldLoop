"""Authorized same-machine comparison from immutable recorded reconciliation."""
from decimal import Decimal

from accounts.security import ReadyAccount
from accounts.serializers import StrictSerializer
from accounts.views import ProtectedView
from django.db import transaction
from jobs.models import ProductionJob
from jobs.serializers import checked, job_data
from materials.models import MaterialEntry
from materials.services import state, visible_job
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


class ComparisonInput(StrictSerializer):
    left = serializers.IntegerField(min_value=1)
    right = serializers.IntegerField(min_value=1)

    def validate(self, values):
        if values["left"] == values["right"]:
            raise serializers.ValidationError("Choose two different jobs.", code="different_jobs_required")
        return values


def source(job, actor):
    data = state(job, actor, {"page": 1, "page_size": 1})
    entries = list(MaterialEntry.objects.filter(job=job, void__isnull=True).order_by("pk"))
    grouped = {}
    for entry in entries:
        if entry.kind == "scrap":
            key = entry.scrap_reason or None
            group = grouped.setdefault(key, {"reason": key, "quantity": Decimal(0), "entry_ids": []})
            group["quantity"] += entry.quantity
            group["entry_ids"].append(entry.pk)
    categories = sorted(grouped.values(), key=lambda group: (-group["quantity"], group["reason"] or ""))
    return {"job": job_data(job, actor), "material": data["material"], "summary": data["summary"],
            "scrap_by_reason": [{**group, "quantity": format(group["quantity"], ".3f")} for group in categories],
            "entry_ids": [entry.pk for entry in entries]}


class ComparisonView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    @transaction.atomic
    def get(self, request):
        values = checked(ComparisonInput, request.query_params.dict())
        # Stable lock order, matching all material mutations' job lock.
        jobs = {pk: visible_job(request.user, pk, lock=True) for pk in sorted(values.values())}
        left, right = (source(jobs[values[key]], request.user) for key in ("left", "right"))
        same = bool(left["job"]["machine"].strip()) and left["job"]["machine"].strip().casefold() == right["job"]["machine"].strip().casefold()
        comparable = bool(left["material"] and right["material"] and left["material"]["id"] == right["material"]["id"])
        differences = None
        if same and comparable and left["summary"] and right["summary"]:
            differences = {}
            for key in ("issued", "good", "scrap", "offcut", "variance", "yield_rate", "scrap_rate"):
                a, b = left["summary"][key], right["summary"][key]
                differences[key] = format(Decimal(a) - Decimal(b), ".3f") if a is not None and b is not None else None
        return Response({"same_machine": same, "comparable_material": comparable,
                         "left": left, "right": right, "differences": differences})


class MachinesView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def get(self, request):
        # Shared machine names only; no hidden job identifiers, quantities or counts.
        return Response({"machines": list(ProductionJob.objects.exclude(machine="").order_by("machine").values_list("machine", flat=True).distinct())})
