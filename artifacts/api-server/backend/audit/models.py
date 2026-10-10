"""Strictly typed audit payloads; no arbitrary metadata or request bodies."""
from accounts.models import User
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class AppendOnlyQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Audit events cannot be updated.")

    def delete(self):
        raise ValidationError("Audit events cannot be deleted.")

    def bulk_update(self, objs, fields, batch_size=None):
        raise ValidationError("Audit events cannot be updated.")

    def bulk_create(self, objs, **kwargs):
        raise ValidationError("Create validated audit events individually.")


class AuditEvent(models.Model):
    class EventType(models.TextChoices):
        ACCOUNT_CREATED = "account_created", "Account created"
        ROLE_CHANGED = "role_changed", "Role changed"
        ACTIVATION_CHANGED = "activation_changed", "Activation changed"
        PASSWORD_CHANGED = "password_changed", "Password changed"
        PASSWORD_RESET = "password_reset", "Password reset"
        MANAGER_BOOTSTRAPPED = "manager_bootstrapped", "Manager bootstrapped"

    class Outcome(models.TextChoices):
        SUCCESS = "success", "Success"
        DENIED = "denied", "Denied"

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.PROTECT, related_name="performed_audit_events",
    )
    target = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="account_audit_events",
    )
    event_type = models.CharField(max_length=32, choices=EventType.choices)
    occurred_at = models.DateTimeField(auto_now_add=True)
    outcome = models.CharField(max_length=8, choices=Outcome.choices)
    request_id = models.UUIDField(null=True, blank=True)
    # Typed allowlist instead of a JSON/text payload that might capture secrets.
    old_role = models.CharField(max_length=32, choices=User.Role.choices, null=True, blank=True)
    new_role = models.CharField(max_length=32, choices=User.Role.choices, null=True, blank=True)
    old_is_active = models.BooleanField(null=True, blank=True)
    new_is_active = models.BooleanField(null=True, blank=True)

    objects = AppendOnlyQuerySet.as_manager()

    class Meta:
        ordering = ("-occurred_at", "-pk")
        indexes = (
            models.Index(fields=["occurred_at"], name="audit_event_time"),
            models.Index(fields=["target", "occurred_at"], name="audit_target_time"),
        )
        constraints = (
            models.CheckConstraint(
                condition=models.Q(outcome__in=["success", "denied"]),
                name="audit_valid_outcome",
            ),
            models.CheckConstraint(
                condition=models.Q(event_type__in=[
                    "account_created", "role_changed", "activation_changed",
                    "password_changed", "password_reset", "manager_bootstrapped",
                ]),
                name="audit_valid_event_type",
            ),
        )

    def clean(self):
        super().clean()
        if self.actor_id is None and self.event_type != self.EventType.MANAGER_BOOTSTRAPPED:
            raise ValidationError("An actor is required except for Manager bootstrap.")
        if self.event_type == self.EventType.ROLE_CHANGED and (
            self.old_role is None or self.new_role is None
        ):
            raise ValidationError("Role changes require both old and new roles.")
        if self.event_type == self.EventType.ACTIVATION_CHANGED and (
            self.old_is_active is None or self.new_is_active is None
        ):
            raise ValidationError("Activation changes require both old and new states.")
        if self.event_type != self.EventType.ROLE_CHANGED and (
            self.old_role is not None or self.new_role is not None
        ):
            raise ValidationError("Role details are allowed only for role changes.")
        if self.event_type != self.EventType.ACTIVATION_CHANGED and (
            self.old_is_active is not None or self.new_is_active is not None
        ):
            raise ValidationError("Activation details are allowed only for activation changes.")

    def save(self, *args, **kwargs):
        if not self._state.adding or kwargs.get("force_update") or kwargs.get("update_fields"):
            raise ValidationError("Audit events cannot be updated.")
        self.full_clean()
        # A manually supplied existing PK must never turn an INSERT into UPDATE.
        kwargs["force_insert"] = True
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit events cannot be deleted.")
