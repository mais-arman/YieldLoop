"""Optional planning metadata; never inferred from actual production."""
from decimal import Decimal

FIELDS = ("product_specification", "sheet_width", "sheet_height", "sheet_unit", "planned_yield", "cutting_instructions")


def data(job):
    return {key: format(value, ".3f") if isinstance(value := getattr(job, key), Decimal) else value for key in FIELDS}
