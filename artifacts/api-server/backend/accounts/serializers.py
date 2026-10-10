from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if not isinstance(data, dict) or set(data) - set(self.fields):
            raise serializers.ValidationError({"non_field_errors": ["Unrecognized fields."]})
        return super().to_internal_value(data)


class LoginInput(StrictSerializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=256, trim_whitespace=False, write_only=True)


class EmployeeInput(StrictSerializer):
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=User.Role.choices)
    temporary_password = serializers.CharField(max_length=256, trim_whitespace=False, write_only=True)


class EmployeeUpdate(StrictSerializer):
    role = serializers.ChoiceField(choices=User.Role.choices, required=False)
    is_active = serializers.BooleanField(required=False)


class PasswordInput(StrictSerializer):
    current_password = serializers.CharField(max_length=256, trim_whitespace=False, write_only=True)
    new_password = serializers.CharField(max_length=256, trim_whitespace=False, write_only=True)


class ResetInput(StrictSerializer):
    temporary_password = serializers.CharField(max_length=256, trim_whitespace=False, write_only=True)


def checked(serializer_class, data):
    serializer = serializer_class(data=data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def password_policy(password, user):
    try:
        validate_password(password, user)
    except DjangoValidationError:
        raise serializers.ValidationError("Password does not meet policy.") from None
