"""Exact quantities; percentages rounded HALF_UP to 3dp solely for presentation."""
from decimal import ROUND_HALF_UP, Decimal, localcontext

from rest_framework.exceptions import ValidationError

ZERO = Decimal("0.000")


def calculate(entries, material_id):
    totals = dict.fromkeys(("issue", "good", "scrap", "offcut"), ZERO)
    with localcontext() as context:
        context.prec = 40
        for entry in entries:
            if entry.unit != "kg" or entry.material_id != material_id or entry.kind not in totals:
                raise ValidationError("Incompatible material or unit.")
            totals[entry.kind] += entry.quantity
        issued = totals.pop("issue")
        accounted = totals["good"] + totals["scrap"] + totals["offcut"]
        def rate(quantity):
            return (
                (quantity / issued * 100).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
                if issued > 0 else None
            )
        return {
            "issued": issued, **totals, "accounted": accounted, "variance": issued - accounted,
            "yield_rate": rate(totals["good"]), "scrap_rate": rate(totals["scrap"]),
        }
