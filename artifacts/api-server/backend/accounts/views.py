from django.contrib.auth import authenticate, login, logout
from django.db import transaction
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.debug import sensitive_post_parameters
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import User
from .security import ManagerOnly, lock_accounts, throttle
from .serializers import (
    EmployeeInput,
    EmployeeUpdate,
    LoginInput,
    PasswordInput,
    ResetInput,
    checked,
)


@method_decorator(never_cache, name="dispatch")
@method_decorator(sensitive_post_parameters(), name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class ProtectedView(APIView):
    permission_classes = (IsAuthenticated,)


class CsrfView(ProtectedView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class LoginView(ProtectedView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def get_authenticate_header(self, request):
        return 'Session realm="YieldLoop"'

    def post(self, request):
        throttle(request, login_name=request.data.get("username", "") if isinstance(request.data, dict) else "")
        values = checked(LoginInput, request.data)
        # Authentication and login serialize with role/activation mutations.
        with transaction.atomic():
            lock_accounts()
            user = authenticate(request, **values)
            if user is None:
                raise AuthenticationFailed(code="invalid_credentials")
            if user.must_change_password and user.temporary_password_expires_at <= timezone.now():
                raise AuthenticationFailed(code="invalid_credentials")
            login(request, user)
            expiry = timezone.now() + timezone.timedelta(hours=12)
            request.session["absolute_expiry"] = expiry.timestamp()
            request.session.set_expiry(expiry)
        return Response({"user": services.user_data(user), "csrfToken": get_token(request)})


class MeView(ProtectedView):
    def get(self, request):
        # Minimal identity is needed to route restricted users to replacement.
        return Response(services.user_data(request.user))


class LogoutView(ProtectedView):
    def post(self, request):
        logout(request)
        return Response({"status": "logged_out"})


class PasswordView(ProtectedView):
    def post(self, request):
        throttle(request)
        values = checked(PasswordInput, request.data)
        services.change_password(request, values["current_password"], values["new_password"])
        logout(request)
        return Response({"status": "password_changed"})


class EmployeesView(ProtectedView):
    permission_classes = (IsAuthenticated, ManagerOnly)

    def get(self, request):
        return Response([services.user_data(user) for user in User.objects.order_by("username")])

    def post(self, request):
        throttle(request)
        user = services.create_employee(request, checked(EmployeeInput, request.data))
        return Response(services.user_data(user), status=201)


class EmployeeView(ProtectedView):
    permission_classes = (IsAuthenticated, ManagerOnly)

    def patch(self, request, pk):
        throttle(request)
        user = services.update_employee(request, pk, checked(EmployeeUpdate, request.data))
        return Response(services.user_data(user))


class ResetView(ProtectedView):
    permission_classes = (IsAuthenticated, ManagerOnly)

    def post(self, request, pk):
        throttle(request)
        values = checked(ResetInput, request.data)
        user = services.reset_password(request, pk, values["temporary_password"])
        return Response(services.user_data(user))
