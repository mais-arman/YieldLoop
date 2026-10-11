import hashlib
from datetime import timedelta

from django.conf import settings
from django.db import connection, transaction
from django.http import JsonResponse
from django.utils import timezone
from django.utils.crypto import salted_hmac
from rest_framework.authentication import (
    SessionAuthentication as DRFSessionAuthentication,
)
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    PermissionDenied,
    Throttled,
)
from rest_framework.permissions import BasePermission

from .models import AuthRateBucket, User

ACCOUNT_LOCK = 732914502  # One application-wide transaction lock for account mutations.


def lock_accounts():
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(%s)", [ACCOUNT_LOCK])


class SessionAuthentication(DRFSessionAuthentication):
    def authenticate_header(self, request):
        return 'Session realm="YieldLoop"'

    def authenticate(self, request):
        result = super().authenticate(request)
        if result:
            deadline = request.session.get("absolute_expiry", 0)
            if deadline <= timezone.now().timestamp():
                request.session.flush()
                raise AuthenticationFailed("Session expired.")
        return result


class ReadyAccount(BasePermission):
    def has_permission(self, request, view):
        if request.user.must_change_password:
            raise PermissionDenied(code="password_change_required")
        return True


class ManagerOnly(ReadyAccount):
    def has_permission(self, request, view):
        super().has_permission(request, view)
        return request.user.role == User.Role.MANAGER


class ReportingAccess(ReadyAccount):
    def has_permission(self, request, view):
        super().has_permission(request, view)
        return request.user.role in (User.Role.MANAGER, User.Role.PRODUCTION_SUPERVISOR)


class Conflict(APIException):
    status_code = 409
    default_code = "conflict"


def csrf_failure(request, reason=""):
    return JsonResponse({"code": "csrf_failed"}, status=403)


def exception_handler(exc, context):
    from rest_framework.views import exception_handler as drf_exception_handler

    response = drf_exception_handler(exc, context)
    if response is None:
        return None
    code = getattr(exc, "default_code", "request_failed")
    if hasattr(exc, "get_codes"):
        codes = exc.get_codes()
        if isinstance(codes, str):
            code = codes
    if response.status_code == 400:
        # Deliberately omit submitted values and English framework error strings.
        response.data = {"code": getattr(exc, "public_code", "validation_error")}
        if hasattr(exc, "public_fields"):
            response.data["fields"] = exc.public_fields
    else:
        response.data = {"code": code}
    return response


def throttle(request, *, login_name=None):
    """Shared fixed-window counters; account limit plus proxy-safe aggregate limit.

    Never trust caller-controlled X-Forwarded-For. REMOTE_ADDR may be the gateway;
    use a generous aggregate bound and a strict normalized-account bound.
    """
    identities = [(f"peer:{request.META.get('REMOTE_ADDR', '')}", 300)]
    if login_name is not None:
        identities.append((f"login:{str(login_name).casefold()[:150]}", 10))
    elif request.user and request.user.is_authenticated:
        identities.append((f"user:{request.user.pk}", 30))
    denied = False
    now = timezone.now()
    for identity, limit in identities:
        digest = salted_hmac("yieldloop.throttle", identity, secret=settings.SECRET_KEY).hexdigest()
        lock = int.from_bytes(hashlib.sha256(digest.encode()).digest()[:8], "big", signed=True)
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_advisory_xact_lock(%s)", [lock])
            bucket, _ = AuthRateBucket.objects.get_or_create(key=digest, defaults={"window_start": now})
            if now >= bucket.window_start + timedelta(seconds=60):
                bucket.window_start, bucket.count = now, 0
            bucket.count = min(bucket.count + 1, limit + 1)
            bucket.save()
            denied = denied or bucket.count > limit
        # Stop before allocating arbitrary username buckets for a blocked peer.
        if denied:
            break
    if denied:
        raise Throttled(wait=60)
