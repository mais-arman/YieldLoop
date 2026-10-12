from accounts.security import ReadyAccount
from accounts.views import ProtectedView
from django.db import transaction
from django.db.models import Q
from jobs.policy import require_creator
from jobs.serializers import checked
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import services
from .models import Material
from .serializers import (
    DefinitionInput,
    EntryInput,
    JobPageInput,
    PageInput,
    VoidInput,
    material_data,
)


class MaterialsView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def get(self, request):
        values = checked(PageInput, request.query_params.dict())
        queryset = Material.objects.all()
        # Recording Operators need the shared catalogue for a first material issue.
        # Creation stays Manager-only; this exposes no underlying job records.
        if values["search"]:
            queryset = queryset.filter(Q(name__icontains=values["search"]) | Q(specification__icontains=values["search"]))
        return Response(services.paginate(queryset, values, material_data))

    def post(self, request):
        require_creator(request.user)
        material = services.create_material(request, checked(DefinitionInput, request.data))
        return Response(material_data(material), status=201)


class JobMaterialsView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    @transaction.atomic
    def get(self, request, pk):
        # Same job lock as writers: page rows and the persisted totals share one revision.
        job = services.visible_job(request.user, pk, lock=True)
        values = checked(JobPageInput, request.query_params.dict())
        return Response(services.state(job, request.user, values))


class EntriesView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def post(self, request, pk):
        return Response(services.mutate(request, pk, checked(EntryInput, request.data)), status=201)


class VoidView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def post(self, request, pk, entry_id):
        return Response(services.mutate(request, pk, checked(VoidInput, request.data), entry_id))
