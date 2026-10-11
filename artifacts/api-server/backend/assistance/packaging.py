"""Concept parameters, not manufacturing tolerances or validated cutting dielines."""
import re
from decimal import Decimal

from rest_framework.exceptions import ValidationError

LABELS = {
    "length": ("Internal length", "الطول الداخلي"),
    "width": ("Internal width", "العرض الداخلي"),
    "height": ("Internal height", "الارتفاع الداخلي"),
    "thickness": ("Material thickness", "سماكة المادة"),
    "lid_height": ("Lid wall height", "ارتفاع جدار الغطاء"),
    "clearance": ("Lid clearance per side", "خلوص الغطاء لكل جانب"),
}
TYPES = {"tray": ("Open tray", "صينية مفتوحة"), "sleeve": ("Open-ended sleeve", "غلاف مفتوح الطرفين"),
         "lid_box": ("Box with separate lid", "علبة بغطاء منفصل")}
BOUNDS = {k: ("0.1", "20") if k in ("thickness", "clearance") else ("1", "5000") for k in LABELS}


def keys(template):
    return ["length", "width", "height", "thickness"] + (["lid_height", "clearance"] if template == "lid_box" else [])


def invalid(fields):
    error = ValidationError("Invalid packaging concept.")
    error.public_fields = {k: [v] for k, v in fields.items()}
    raise error


def catalogue():
    return {"templates": [{
        "id": key, "label": dict(zip(("en", "ar"), label)), "unit": "mm",
        "dimension_basis": "internal", "production_validated": False,
        "states": ["assembled"] if key == "sleeve" else ["assembled", "open"],
        "parameters": [{"key": k, "label": dict(zip(("en", "ar"), LABELS[k])),
                        "min": float(BOUNDS[k][0]), "max": float(BOUNDS[k][1]), "required": True} for k in keys(key)],
    } for key, label in TYPES.items()], "limitations": ["concept_only", "no_dieline", "no_cutting_transfer"]}


def validate(data):
    if not isinstance(data, dict) or set(data) != {"template", "name", "parameters", "state"}:
        invalid({"design": "invalid_fields"})
    template = data["template"]
    if not isinstance(template, str) or template not in TYPES:
        invalid({"template": "unsupported_template"})
    if not isinstance(data["name"], str) or not 1 <= len(data["name"].strip()) <= 160:
        invalid({"name": "required_max_160"})
    if data["state"] not in (["assembled"] if template == "sleeve" else ["assembled", "open"]):
        invalid({"state": "unsupported_state"})
    params = data["parameters"]
    if not isinstance(params, dict) or set(params) != set(keys(template)):
        invalid({"parameters": "missing_or_unknown_parameters"})
    errors, numbers, normalized = {}, {}, {}
    for key, value in params.items():
        if not isinstance(value, str) or not re.fullmatch(r"\d{1,4}(?:\.\d{1,3})?", value):
            errors[key] = "decimal_mm_required"
            continue
        number = Decimal(value)
        lo, hi = map(Decimal, BOUNDS[key])
        if not lo <= number <= hi:
            errors[key] = "out_of_range"
        numbers[key], normalized[key] = number, format(number, "f")
    if errors:
        invalid(errors)
    if 4 * numbers["thickness"] > min(numbers[k] for k in ("length", "width", "height")):
        invalid({"thickness": "too_thick"})
    if template == "lid_box" and numbers["lid_height"] > numbers["height"]:
        invalid({"lid_height": "exceeds_height"})
    return {"template": template, "name": data["name"].strip(), "parameters": normalized, "state": data["state"]}
