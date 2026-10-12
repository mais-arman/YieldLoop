"""Current-state reports over a creation-date cohort, never historical flows."""
from datetime import datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal, localcontext
from zoneinfo import ZoneInfo

from accounts.security import ReportingAccess
from accounts.serializers import StrictSerializer
from accounts.views import ProtectedView
from django.db import connection, transaction
from django.db.models import Count, OuterRef, Subquery, Sum
from django.utils import timezone
from inventory.services import lot_data, lots
from jobs.models import ProductionJob
from jobs.policy import visible_jobs
from jobs.serializers import checked
from materials.models import Material, Reconciliation
from materials.services import paginate
from rest_framework import serializers
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

FIELDS = ("issued", "good", "scrap", "offcut", "pending_rework", "accounted", "variance")


class ReportInput(StrictSerializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    timezone = serializers.ChoiceField(choices=["UTC", "Asia/Jerusalem"], default="UTC")
    status = serializers.ChoiceField(choices=ProductionJob.Status.choices, required=False)
    material_id = serializers.IntegerField(min_value=1, required=False)
    job_page = serializers.IntegerField(min_value=1, default=1)
    lot_page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=20)

    def validate(self, values):
        start, end = values.get("start_date"), values.get("end_date")
        if start and end and start > end:
            raise serializers.ValidationError({"end_date": "Invalid range"}, code="date_order")
        for key in ("start_date", "end_date"):
            if key in values and not 1900 <= values[key].year <= 9998:
                raise serializers.ValidationError({key: "Unsupported year"}, code="date_range")
        return values


def decimal_text(value):
    return format(value or Decimal(0), ".3f")


def measures(values):
    from materials.accounting import percentage
    result = {key: decimal_text(values[key]) for key in FIELDS}
    with localcontext() as ctx:
        ctx.prec = 60
        for name, numerator in (("yield_rate", "good"), ("scrap_rate", "scrap"), ("offcut_rate", "offcut")):
            rate = percentage(values[numerator], values["issued"])
            result[name] = format(rate, ".3f") if rate is not None else None
    return result


def overview(actor, filters):
    # A single read snapshot keeps count, totals and both pages consistent even
    # if another request corrects measurements or cancels a job during the read.
    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
        generated_at = timezone.now().isoformat()
        jobs = visible_jobs(actor)
        zone = ZoneInfo(filters["timezone"])
        if filters.get("start_date"):
            jobs = jobs.filter(created_at__gte=datetime.combine(filters["start_date"], time.min, zone))
        if filters.get("end_date"):
            jobs = jobs.filter(created_at__lt=datetime.combine(filters["end_date"] + timedelta(days=1), time.min, zone))
        if filters.get("status"):
            jobs = jobs.filter(status=filters["status"])
        material = None
        if filters.get("material_id"):
            accessible = Material.objects.all()
            if actor.role == "cutting_operator":
                accessible = accessible.filter(materialentry__job__in=visible_jobs(actor)).distinct()
            material = accessible.filter(pk=filters["material_id"]).first()
            if material is None:
                raise NotFound()
            jobs = jobs.filter(reconciliations__material=material).distinct()
        latest = Reconciliation.objects.filter(job_id=OuterRef("job_id")).order_by("-revision").values("pk")[:1]
        snapshots = Reconciliation.objects.filter(job__in=jobs, pk=Subquery(latest))
        counts = dict.fromkeys(ProductionJob.Status.values, 0)
        counts.update({row["status"]: row["n"] for row in jobs.order_by().values("status").annotate(n=Count("pk", distinct=True))})
        measured = snapshots.count()
        production = None
        if material is not None:
            totals = snapshots.aggregate(**{key: Sum(key) for key in FIELDS})
            production = measures({key: totals[key] or Decimal(0) for key in FIELDS})
        inventory = lots(actor).filter(source__job__in=jobs)
        inventory_states = {}
        for state, is_void in (("available", False), ("voided", True)):
            aggregate = inventory.filter(is_void=is_void).aggregate(count=Count("pk"), quantity=Sum("source__quantity"))
            inventory_states[state] = {
                "count": aggregate["count"],
                # Voided quantity is original registered weight, NOT consumed.
                "original_quantity": decimal_text(aggregate["quantity"]) if material is not None else None,
                "remaining": ("0.000" if is_void else decimal_text(aggregate["quantity"])) if material is not None else None,
            }
            if material is not None and not is_void:
                from inventory.models import StockMovement
                consumed = StockMovement.objects.filter(lot__in=inventory.filter(is_void=False),
                                                        action="consume").aggregate(q=Sum("quantity"))["q"] or Decimal(0)
                inventory_states[state]["remaining"] = decimal_text((aggregate["quantity"] or Decimal(0)) - consumed)

        # Page jobs first, then fetch snapshots in one bounded query (no N+1).
        def job_row(job):
            return {"id": job.pk, "job_number": job.job_number, "title": job.title,
                    "reference": job.reference, "machine": job.machine, "is_demo": job.is_demo,
                    "status": job.status, "created_at": job.created_at.isoformat()}
        job_page = paginate(jobs.order_by("-created_at", "-pk"),
                            {"page": filters["job_page"], "page_size": filters["page_size"]}, job_row)
        page_snapshots = snapshots.filter(job_id__in=[row["id"] for row in job_page["results"]]).select_related("material")
        indexed = {row.job_id: row for row in page_snapshots}
        for row in job_page["results"]:
            snap = indexed.get(row["id"])
            row["reconciliation"] = None if snap is None else {
                "id": snap.pk, "revision": snap.revision, "created_at": snap.created_at.isoformat(),
                "material_id": snap.material_id, "material_name": snap.material.name,
                "specification": snap.material.specification,
                **measures({key: getattr(snap, key) for key in FIELDS}),
            }
        return {
            "generated_at": generated_at, "date_basis": "job_created_at", "timezone": filters["timezone"],
            "start_date": filters.get("start_date"), "end_date": filters.get("end_date"),
            "status": filters.get("status"),
            "material": None if material is None else {"id": material.pk, "name": material.name, "specification": material.specification},
            "unit": "kg", "job_counts": counts, "job_count": sum(counts.values()),
            "measured_jobs": measured, "unmeasured_jobs": sum(counts.values()) - measured,
            "production": production, "quantity_unavailable_reason": "select_material" if material is None else None,
            "inventory": inventory_states, "jobs": job_page,
            "lots": paginate(inventory, {"page": filters["lot_page"], "page_size": filters["page_size"]},
                             lambda row: lot_data(row, actor)),
        }


class OverviewView(ProtectedView):
    permission_classes = (IsAuthenticated, ReportingAccess)

    def get(self, request):
        return Response(overview(request.user, checked(ReportInput, request.query_params)))
