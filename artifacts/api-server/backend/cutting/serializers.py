import re

from accounts.serializers import StrictSerializer
from rest_framework import serializers


class Millimetres(serializers.CharField):
    def __init__(self, positive=False, **kwargs):
        self.positive = positive
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        if not isinstance(data, str) or not re.fullmatch(r"(0|[1-9]\d{0,5})(\.\d{1,3})?", data):
            raise serializers.ValidationError("Use a decimal string with up to three places.", code="dimension_format")
        from decimal import Decimal
        value = Decimal(data)
        if value > 100000 or (value <= 0 if self.positive else value < 0):
            raise serializers.ValidationError("Out of supported range.", code="dimension_range")
        return format(value, ".3f")


class BoardInput(StrictSerializer):
    width = Millimetres(positive=True)
    height = Millimetres(positive=True)
    quantity = serializers.IntegerField(min_value=1, max_value=10)
    left = Millimetres()
    right = Millimetres()
    top = Millimetres()
    bottom = Millimetres()


class PieceInput(StrictSerializer):
    key = serializers.RegexField(r"^[A-Za-z0-9_-]{1,32}$")
    label = serializers.CharField(max_length=80)
    width = Millimetres(positive=True)
    height = Millimetres(positive=True)
    quantity = serializers.IntegerField(min_value=1, max_value=100)
    rotation_allowed = serializers.BooleanField()


class GeometryInput(StrictSerializer):
    unit = serializers.ChoiceField(choices=["mm"])
    material_id = serializers.IntegerField(min_value=1)
    stock_label = serializers.CharField(max_length=120)
    cutting_mode = serializers.ChoiceField(choices=["rectangular_spacing_only"])
    board = BoardInput()
    kerf = Millimetres()
    pieces = PieceInput(many=True, min_length=1, max_length=20)


class PlacementInput(StrictSerializer):
    piece_key = serializers.RegexField(r"^[A-Za-z0-9_-]{1,32}$")
    copy = serializers.IntegerField(min_value=0, max_value=99)
    board = serializers.IntegerField(min_value=0, max_value=9)
    x = Millimetres()
    y = Millimetres()
    rotated = serializers.BooleanField()


class SourceInput(StrictSerializer):
    concept_id = serializers.IntegerField(min_value=1)
    revision = serializers.IntegerField(min_value=1)
    method = serializers.ChoiceField(choices=["separate_panels_v1"])


class ScenarioInput(StrictSerializer):
    source = SourceInput(required=False)
    key = serializers.RegexField(r"^[A-Za-z0-9_-]{1,32}$")
    name = serializers.CharField(max_length=80)
    input = GeometryInput()
    placements = PlacementInput(many=True, max_length=100)
    origin = serializers.ChoiceField(choices=["manual", "shelf_v1"])


class EvaluateInput(StrictSerializer):
    scenario = ScenarioInput()
    generate = serializers.BooleanField()


class PlanInput(StrictSerializer):
    name = serializers.CharField(max_length=160)
    revision = serializers.IntegerField(min_value=0)
    request_id = serializers.UUIDField()
    reason = serializers.CharField(max_length=1000)
    scenarios = ScenarioInput(many=True, min_length=1, max_length=4)


class ListInput(StrictSerializer):
    page = serializers.IntegerField(min_value=1, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=100, default=20)
