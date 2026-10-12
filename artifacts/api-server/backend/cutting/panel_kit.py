"""Exact rectangular components of the existing separate-panel box; no folds/tabs."""
from decimal import Decimal

from assistance.packaging import validate
from rest_framework.exceptions import NotFound, PermissionDenied

from .geometry import fail
from .models import PackagingRevision


def kit(actor, source):
    if actor.role not in ("manager", "production_supervisor"):
        raise PermissionDenied()
    row = PackagingRevision.objects.filter(package_id=source["concept_id"], revision=source["revision"]).first()
    if row is None:
        raise NotFound()
    return pieces(row.design)


def pieces(design):
    design = validate(design)
    if design["template"] != "flat_box":
        fail("unsupported_panel_kit")
    p = {k: Decimal(v) for k, v in design["parameters"].items()}
    length, width, height, thick = (p[k] for k in ("length", "width", "height", "thickness"))
    li, wi = length + 2 * thick + 2 * p["clearance"], width + 2 * thick + 2 * p["clearance"]
    rows = [
        ("base", length + 2 * thick, width + 2 * thick, 1),
        ("base_end", width, height, 2),
        ("base_side", length + 2 * thick, height, 2),
        ("lid_top", li + 2 * thick, wi + 2 * thick, 1),
        ("lid_end", wi, p["lid_height"], 2),
        ("lid_side", li + 2 * thick, p["lid_height"], 2),
    ]
    return [{"key": key, "label": key.replace("_", " "), "width": format(w, ".3f"),
             "height": format(h, ".3f"), "quantity": q, "rotation_allowed": False}
            for key, w, h, q in rows]


def verify(scenario):
    source = scenario.get("source")
    if source is None:
        return
    row = PackagingRevision.objects.filter(package_id=source["concept_id"], revision=source["revision"]).first()
    if row is None:
        raise NotFound()
    expected = {p["key"]: p for p in pieces(row.design)}
    actual = scenario["input"]["pieces"]
    if len(actual) != len(expected):
        fail("panel_kit_mismatch")
    for part in actual:
        ref = expected.pop(part["key"], None)
        if ref is None or any(part[k] != ref[k] for k in ("width", "height", "quantity")):
            fail("panel_kit_mismatch")
