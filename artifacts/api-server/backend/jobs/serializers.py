from accounts.serializers import StrictSerializer
from decimal import Decimal
from rest_framework import serializers

from .models import ProductionJob


class JobInputError(serializers.ValidationError):
    def __init__(self, fields):
        super().__init__(fields)
        # Only serializer-generated codes, not submitted values or framework text.
        self.public_fields = fields


def checked(serializer_class, data):
    serializer = serializer_class(data=data)
    if not serializer.is_valid():
        codes = serializers.ValidationError(serializer.errors).get_codes()
        raise JobInputError(codes)
    return serializer.validated_data


class CardInput(StrictSerializer):
    product_specification = serializers.CharField(max_length=5000, allow_blank=True, required=False)
    cutting_instructions = serializers.CharField(max_length=5000, allow_blank=True, required=False)
    sheet_width = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal(".001"), allow_null=True, required=False)
    sheet_height = serializers.DecimalField(max_digits=12, decimal_places=3, min_value=Decimal(".001"), allow_null=True, required=False)
    sheet_unit = serializers.ChoiceField(choices=["", "mm", "cm", "in"], required=False)
    planned_yield = serializers.DecimalField(max_digits=6, decimal_places=3, min_value=Decimal(0), max_value=Decimal(100), allow_null=True, required=False)

    def validate(self, values):
        for key in ("sheet_width", "sheet_height", "planned_yield"):
            if key in self.initial_data and self.initial_data[key] is not None and not isinstance(self.initial_data[key], str):
                raise serializers.ValidationError({key: "Send a decimal string."}, code="decimal_string_required")
        return values


class CreateInput(CardInput):
    reference = serializers.CharField(max_length=120, allow_blank=True, required=False)
    machine = serializers.CharField(max_length=120, allow_blank=True, required=False)
    title = serializers.CharField(max_length=200)
    notes = serializers.CharField(max_length=5000, allow_blank=True, required=False)


class UpdateInput(CardInput):
    reference = serializers.CharField(max_length=120, allow_blank=True, required=False)
    machine = serializers.CharField(max_length=120, allow_blank=True, required=False)
    revision = serializers.IntegerField(min_value=1)
    title = serializers.CharField(max_length=200, required=False)
    notes = serializers.CharField(max_length=5000, allow_blank=True, required=False)
    status = serializers.ChoiceField(choices=ProductionJob.Status.choices, required=False)

    def validate(self, values):
        if len(values) == 1:
            raise serializers.ValidationError("No changes supplied.", code="empty_update")
        return super().validate(values)


class ListInput(StrictSerializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=20)
    search = serializers.CharField(max_length=120, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=ProductionJob.Status.choices, required=False)


def job_data(job, user):
    from .card import data
    from .policy import capabilities

    return {
        **data(job),
        "id": job.pk, "job_number": job.job_number, "title": job.title,
        "reference": job.reference, "machine": job.machine, "is_demo": job.is_demo,
        "notes": job.notes, "status": job.status, "revision": job.revision,
        "created_by": {"id": job.created_by_id, "username": job.created_by.username},
        "created_at": job.created_at.isoformat(), "updated_at": job.updated_at.isoformat(),
        "permissions": capabilities(user, job),
    }
