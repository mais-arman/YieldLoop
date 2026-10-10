from decimal import Decimal

from accounts.serializers import StrictSerializer
from rest_framework import serializers

from .models import MaterialEntry


class DefinitionInput(StrictSerializer):
    name = serializers.CharField(max_length=160)
    specification = serializers.CharField(max_length=500)
    unit = serializers.ChoiceField(choices=["kg"])


class RevisionInput(StrictSerializer):
    revision = serializers.IntegerField(min_value=0)
    job_revision = serializers.IntegerField(min_value=1)


class EntryInput(RevisionInput):
    material_id = serializers.IntegerField(min_value=1)
    kind = serializers.ChoiceField(choices=MaterialEntry.Kind.choices)
    quantity = serializers.DecimalField(max_digits=15, decimal_places=3, min_value=Decimal("0.001"))
    unit = serializers.ChoiceField(choices=["kg"])
    note = serializers.CharField(max_length=1000, allow_blank=True, default="")
    request_id = serializers.UUIDField()

    def validate_quantity(self, value):
        # JSON numbers have already passed through binary floating point.
        if not isinstance(self.initial_data.get("quantity"), str):
            raise serializers.ValidationError("Send a decimal string.", code="decimal_string_required")
        return value


class VoidInput(RevisionInput):
    reason = serializers.CharField(max_length=1000)


class PageInput(StrictSerializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=20)
    search = serializers.CharField(max_length=120, allow_blank=True, default="")


def material_data(material):
    return {
        "id": material.pk, "name": material.name, "specification": material.specification,
        "unit": material.unit, "created_at": material.created_at.isoformat(),
    }


def entry_data(entry):
    void = getattr(entry, "void", None)
    return {
        "id": entry.pk, "material_id": entry.material_id, "kind": entry.kind,
        "quantity": format(entry.quantity, ".3f"), "unit": entry.unit, "note": entry.note,
        "created_at": entry.created_at.isoformat(),
        "created_by": {"id": entry.created_by_id, "username": entry.created_by.username},
        "void": {
            "reason": void.reason, "created_at": void.created_at.isoformat(),
            "created_by": {"id": void.created_by_id, "username": void.created_by.username},
        } if void else None,
    }
