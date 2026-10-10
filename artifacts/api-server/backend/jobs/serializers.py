from accounts.serializers import StrictSerializer
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


class CreateInput(StrictSerializer):
    title = serializers.CharField(max_length=200)
    notes = serializers.CharField(max_length=5000, allow_blank=True, required=False)


class UpdateInput(StrictSerializer):
    revision = serializers.IntegerField(min_value=1)
    title = serializers.CharField(max_length=200, required=False)
    notes = serializers.CharField(max_length=5000, allow_blank=True, required=False)
    status = serializers.ChoiceField(choices=ProductionJob.Status.choices, required=False)

    def validate(self, values):
        if len(values) == 1:
            raise serializers.ValidationError("No changes supplied.", code="empty_update")
        return values


class ListInput(StrictSerializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=20)
    search = serializers.CharField(max_length=120, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=ProductionJob.Status.choices, required=False)


def job_data(job, user):
    from .policy import capabilities

    return {
        "id": job.pk, "job_number": job.job_number, "title": job.title,
        "notes": job.notes, "status": job.status, "revision": job.revision,
        "created_by": {"id": job.created_by_id, "username": job.created_by.username},
        "created_at": job.created_at.isoformat(), "updated_at": job.updated_at.isoformat(),
        "permissions": capabilities(user, job),
    }
