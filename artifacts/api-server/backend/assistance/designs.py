"""Persist validated parametric concepts, never manufacturing dielines."""
from accounts.security import Conflict
from accounts.serializers import StrictSerializer
from cutting.models import PackagingDesign, PackagingRevision
from django.core.exceptions import ValidationError as ModelValidationError
from django.db import IntegrityError, transaction
from jobs.serializers import checked
from jobs.services import ready_actor
from materials.serializers import PageInput
from materials.services import paginate
from rest_framework import serializers
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from .packaging import validate
from .views import ReadyView


class SaveInput(StrictSerializer):
    design = serializers.JSONField()
    reason = serializers.CharField(max_length=1000)
    request_id = serializers.UUIDField()
    revision = serializers.IntegerField(min_value=1, required=False)

    def validate_design(self, value):
        return validate(value)


def data(row):
    return {"id": row.pk, "revision": row.revision, "design": row.design,
            "updated_at": row.updated_at.isoformat(), "production_validated": False}


def save(request, pk=None):
    values = checked(SaveInput, request.data)
    try:
        with transaction.atomic():
            actor = ready_actor(request)
            if pk is None:
                row = PackagingDesign.objects.create(design=values["design"], created_by=actor)
            else:
                try:
                    row = PackagingDesign.objects.select_for_update().get(pk=pk)
                except PackagingDesign.DoesNotExist:
                    raise NotFound() from None
                if values.get("revision") != row.revision:
                    raise Conflict(code="stale_revision")
                row.revision += 1
                row.design = values["design"]
                row.save(update_fields=["revision", "design", "updated_at"])
            PackagingRevision.objects.create(package=row, revision=row.revision, design=row.design,
                actor=actor, reason=values["reason"], request_id=values["request_id"])
            return data(row)
    except (IntegrityError, ModelValidationError):
        raise Conflict(code="packaging_conflict") from None


class DesignsView(ReadyView):
    def get(self, request):
        return Response(paginate(PackagingDesign.objects.all(), checked(PageInput, request.query_params), data))

    def post(self, request):
        return Response(save(request), status=201)


class DesignView(ReadyView):
    def get(self, request, pk):
        try:
            return Response(data(PackagingDesign.objects.get(pk=pk)))
        except PackagingDesign.DoesNotExist:
            raise NotFound() from None

    def put(self, request, pk):
        return Response(save(request, pk))


class DesignHistoryView(ReadyView):
    def get(self, request, pk):
        if not PackagingDesign.objects.filter(pk=pk).exists():
            raise NotFound()
        return Response(paginate(PackagingRevision.objects.filter(package_id=pk).select_related("actor"),
            checked(PageInput, request.query_params), lambda row: {
                "revision": row.revision, "design": row.design, "reason": row.reason,
                "actor": row.actor.username, "created_at": row.created_at.isoformat()}))
