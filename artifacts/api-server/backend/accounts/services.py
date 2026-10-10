import uuid
from datetime import timedelta

from audit.models import AuditEvent
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotFound,
    PermissionDenied,
    ValidationError,
)

from .models import User
from .security import Conflict, lock_accounts
from .serializers import password_policy


def user_data(user):
    return {
        "id": user.pk, "username": user.username, "first_name": user.first_name,
        "last_name": user.last_name, "role": user.role, "is_active": user.is_active,
        "must_change_password": user.must_change_password,
        "temporary_password_expired": bool(
            user.must_change_password and user.temporary_password_expires_at <= timezone.now()
        ),
    }


def actor_locked(request, manager=False):
    """Called only under the common transaction lock, with a fresh user row."""
    actor = User.objects.select_for_update().get(pk=request.user.pk)
    if not actor.is_active or request.session.get("_auth_user_hash") != actor.get_session_auth_hash():
        raise AuthenticationFailed(code="not_authenticated")
    if manager and (actor.role != User.Role.MANAGER or actor.must_change_password):
        raise PermissionDenied()
    return actor


def audit(actor, target, event, **details):
    AuditEvent.objects.create(
        actor=actor, target=target, event_type=event, outcome="success",
        request_id=uuid.uuid4(), **details,
    )


def target_user(pk):
    try:
        return User.objects.select_for_update().get(pk=pk)
    except User.DoesNotExist:
        raise NotFound() from None


def set_temporary(user, password):
    password_policy(password, user)
    user.set_password(password)
    user.must_change_password = True
    user.temporary_password_expires_at = timezone.now() + timedelta(hours=24)


def validate_user(user):
    try:
        user.full_clean()
    except DjangoValidationError:
        raise ValidationError("Invalid account values.") from None


def create_employee(request, values):
    try:
        with transaction.atomic():
            lock_accounts()
            actor = actor_locked(request, manager=True)
            values = dict(values)
            password = values.pop("temporary_password")
            user = User(**values)
            set_temporary(user, password)
            validate_user(user)
            user.save()
            audit(actor, user, "account_created")
            return user
    except IntegrityError:
        raise Conflict(code="account_conflict") from None


@transaction.atomic
def update_employee(request, pk, values):
    lock_accounts()
    actor = actor_locked(request, manager=True)
    user = target_user(pk)
    role = values.get("role", user.role)
    active = values.get("is_active", user.is_active)
    if user.pk == actor.pk and (role != user.role or not active):
        raise PermissionDenied(code="self_change_forbidden")
    if user.role == User.Role.MANAGER and user.is_active and (
        role != User.Role.MANAGER or not active
    ) and User.objects.filter(role=User.Role.MANAGER, is_active=True).count() <= 1:
        raise Conflict(code="last_manager")
    old_role, old_active = user.role, user.is_active
    if (role, active) != (old_role, old_active):
        user.role, user.is_active = role, active
        user.session_version += 1
        validate_user(user)
        user.save()
        if role != old_role:
            audit(actor, user, "role_changed", old_role=old_role, new_role=role)
        if active != old_active:
            audit(actor, user, "activation_changed", old_is_active=old_active, new_is_active=active)
    return user


@transaction.atomic
def reset_password(request, pk, password):
    lock_accounts()
    actor = actor_locked(request, manager=True)
    user = target_user(pk)
    if actor.pk == user.pk:
        raise PermissionDenied(code="self_change_forbidden")
    set_temporary(user, password)
    user.session_version += 1
    user.save()
    audit(actor, user, "password_reset")
    return user


@transaction.atomic
def change_password(request, current, new):
    lock_accounts()
    user = actor_locked(request)
    if user.must_change_password and user.temporary_password_expires_at <= timezone.now():
        raise PermissionDenied(code="temporary_password_expired")
    if not user.check_password(current):
        raise ValidationError("Invalid password.")
    if current == new:
        raise ValidationError("New password must differ.")
    password_policy(new, user)
    user.set_password(new)
    user.must_change_password = False
    user.temporary_password_expires_at = None
    user.session_version += 1
    user.save()
    audit(user, user, "password_changed")
