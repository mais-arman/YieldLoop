"""Authentication schema only; account-management workflows are not enabled."""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.crypto import salted_hmac


class User(AbstractUser):
    class Role(models.TextChoices):
        CUTTING_OPERATOR = "cutting_operator", "Cutting Operator"
        PRODUCTION_SUPERVISOR = "production_supervisor", "Production Supervisor"
        MANAGER = "manager", "Manager"

    # No default: callers must explicitly choose an application role.
    role = models.CharField(max_length=32, choices=Role.choices)
    must_change_password = models.BooleanField(default=False)
    temporary_password_expires_at = models.DateTimeField(null=True, blank=True)
    session_version = models.PositiveBigIntegerField(default=0, editable=False)

    class Meta:
        constraints = (
            models.CheckConstraint(
                condition=models.Q(role__in=[
                    "cutting_operator", "production_supervisor", "manager",
                ]),
                name="accounts_user_valid_role",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(must_change_password=True, temporary_password_expires_at__isnull=False)
                    | models.Q(must_change_password=False, temporary_password_expires_at__isnull=True)
                ),
                name="accounts_user_temp_password_state",
            ),
        )
        indexes = (models.Index(fields=["role", "is_active"], name="accounts_user_role_active"),)

    def _get_session_auth_hash(self, secret=None):
        """Keep Django's password/key invalidation, adding user-wide revocation.

        Django's inherited fallback-hash iterator passes each old signing key
        here too. Increment session_version atomically in the future account
        service on role/deactivation/reset changes, in the audit transaction.
        """
        return salted_hmac(
            "yieldloop.accounts.User.session_auth_hash",
            f"{self.password}:{self.session_version}",
            secret=secret,
            algorithm="sha256",
        ).hexdigest()
