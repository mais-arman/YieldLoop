from accounts.security import ReadyAccount
from accounts.serializers import StrictSerializer
from accounts.views import ProtectedView
from django.db.models import Q
from jobs.policy import require_editor
from jobs.serializers import checked
from materials.services import paginate
from rest_framework import serializers
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import services
from .models import OffcutLot


class InventoryQuery(StrictSerializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=20)
    search = serializers.CharField(max_length=120, allow_blank=True, default="")
    state = serializers.ChoiceField(choices=["available", "voided"], required=False)
    job_id = serializers.IntegerField(min_value=1, required=False)


class RegisterInput(StrictSerializer):
    job_id = serializers.IntegerField(min_value=1)
    source_entry_id = serializers.IntegerField(min_value=1)
    request_id = serializers.UUIDField()
    reason = serializers.CharField(max_length=1000)


class VoidInput(StrictSerializer):
    revision = serializers.IntegerField(min_value=1)
    request_id = serializers.UUIDField()
    reason = serializers.CharField(max_length=1000)


class InventoryView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def get(self, request):
        values = checked(InventoryQuery, request.query_params.dict())
        qs = services.lots(request.user)
        if values["search"]:
            text = values["search"]
            qs = qs.filter(Q(source__material__name__icontains=text) | Q(source__job__job_number__icontains=text) |
                           Q(source__material__specification__icontains=text))
        if "state" in values:
            qs = qs.filter(is_void=values["state"] == "voided")
        if "job_id" in values:
            qs = qs.filter(source__job_id=values["job_id"])
        return Response(paginate(qs, values, lambda row: services.lot_data(row, request.user)))

    def post(self, request):
        return Response(services.register(request, checked(RegisterInput, request.data)), status=201)


class InventoryDetail(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def get(self, request, pk):
        try:
            lot = services.lots(request.user).get(pk=pk)
        except OffcutLot.DoesNotExist:
            raise NotFound() from None
        result = services.lot_data(lot, request.user)
        # Foundation history is bounded: exactly one addition and at most one void.
        result["history"] = [services.event_data(e) for e in lot.events.select_related("actor")]
        from .movements import balances
        result["reservations"] = [{"job_id": pk, "quantity": format(q, ".3f")}
                                  for pk, q in balances(lot)["jobs"].items() if q > 0]
        return Response(result)


class InventoryVoid(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def post(self, request, pk):
        return Response(services.void_lot(request, pk, checked(VoidInput, request.data)))


class BlockedReuse(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def post(self, request, pk, action):
        if action not in ("reserve", "release", "consume"):
            raise NotFound()
        require_editor(request.user)
        from .movements import move
        return Response(move(request, pk, action, checked(MovementInput, request.data)))


class MovementInput(VoidInput):
    from decimal import Decimal
    job_id = serializers.IntegerField(min_value=1)
    quantity = serializers.DecimalField(max_digits=15, decimal_places=3, min_value=Decimal(".001"))

    def validate_quantity(self, value):
        if not isinstance(self.initial_data.get("quantity"), str):
            raise serializers.ValidationError("Send a decimal string.")
        return value


class MovementsView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def get(self, request, pk):
        from materials.serializers import PageInput

        from .movements import movement_data
        try:
            lot = services.lots(request.user).get(pk=pk)
        except OffcutLot.DoesNotExist:
            raise NotFound() from None
        return Response(paginate(lot.movements.select_related("actor"),
                                checked(PageInput, request.query_params), movement_data))
