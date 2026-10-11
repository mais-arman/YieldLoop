"""Exact quantities; percentages rounded HALF_UP to 3dp solely for presentation."""
from decimal import ROUND_HALF_UP, Decimal, localcontext

from rest_framework.exceptions import ValidationError

ZERO = Decimal("0.000")


def calculate(entries, material_id):
    totals = dict.fromkeys(("issue", "good", "scrap", "offcut", "rework"), ZERO)
    with localcontext() as context:
        context.prec = 40
        inputs = list(entries)
        for entry in inputs:
            if entry.unit != "kg" or entry.material_id != material_id or entry.kind not in totals:
                raise ValidationError("Incompatible material or unit.")
            totals[entry.kind] += entry.quantity
        issued = totals.pop("issue")
        pending = totals.pop("rework")
        if pending:
            from django.db.models import Sum

            from .models import ReworkResolution
            resolved = ReworkResolution.objects.filter(
                source_id__in=[e.pk for e in inputs if e.kind == "rework"],
                output__void__isnull=True,
            ).aggregate(q=Sum("output__quantity"))["q"] or ZERO
            pending -= resolved
            if pending < 0:
                raise ValidationError("Rework resolution exceeds pending quantity.")
        accounted = totals["good"] + totals["scrap"] + totals["offcut"] + pending
        def rate(quantity):
            return (
                (quantity / issued * 100).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
                if issued > 0 else None
            )
        return {
            "issued": issued, **totals, "pending_rework": pending, "accounted": accounted, "variance": issued - accounted,
            "yield_rate": rate(totals["good"]), "scrap_rate": rate(totals["scrap"]),
        }
