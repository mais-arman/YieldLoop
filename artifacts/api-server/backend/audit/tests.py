from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.db import models
from django.test import SimpleTestCase

from .models import AuditEvent


class AuditSchemaTests(SimpleTestCase):
    def event(self, **kwargs):
        return AuditEvent(
            actor_id=1, target_id=2, outcome="success",
            event_type=kwargs.pop("event_type", "password_changed"), **kwargs,
        )

    def test_no_arbitrary_payload_fields(self):
        fields = {field.name for field in AuditEvent._meta.fields}
        self.assertEqual(fields, {
            "id", "actor", "target", "event_type", "occurred_at", "outcome",
            "request_id", "old_role", "new_role", "old_is_active", "new_is_active",
        })
        with self.assertRaises(TypeError):
            self.event(password="must-not-be-accepted")

    def test_rejects_nonallowlisted_values(self):
        for field, value in [
            ("event_type", "raw_request"),
            ("outcome", "arbitrary-text"),
            ("old_role", "superuser"),
            ("request_id", "cookie-or-token"),
        ]:
            with self.subTest(field=field), self.assertRaises(ValidationError):
                AuditEvent._meta.get_field(field).clean(value, self.event())

    def test_change_details_are_event_specific(self):
        with self.assertRaises(ValidationError):
            self.event(old_role="manager").clean()
        with self.assertRaises(ValidationError):
            self.event(event_type="role_changed", old_role="manager").clean()
        with self.assertRaises(ValidationError):
            self.event(event_type="activation_changed", new_is_active=False).clean()
        self.event(
            event_type="role_changed", old_role="cutting_operator", new_role="manager",
        ).clean()
        self.event(
            event_type="activation_changed", old_is_active=True, new_is_active=False,
        ).clean()

    def test_null_actor_only_for_bootstrap(self):
        event = self.event()
        event.actor_id = None
        with self.assertRaises(ValidationError):
            event.clean()
        event.event_type = "manager_bootstrapped"
        event.clean()

    def test_instance_mutation_is_blocked_without_database(self):
        event = self.event()
        event._state.adding = False
        with self.assertRaises(ValidationError):
            event.save()
        with self.assertRaises(ValidationError):
            event.delete()

    def test_queryset_mutation_and_bulk_bypass_are_blocked(self):
        for operation in [
            lambda: AuditEvent.objects.all().update(outcome="denied"),
            lambda: AuditEvent.objects.all().delete(),
            lambda: AuditEvent.objects.bulk_update([], ["outcome"]),
            lambda: AuditEvent.objects.bulk_create([]),
        ]:
            with self.assertRaises(ValidationError):
                operation()

    def test_create_validates_and_forces_insert(self):
        event = self.event()
        with patch.object(event, "full_clean") as validate, patch.object(models.Model, "save") as save:
            event.save()
        validate.assert_called_once_with()
        save.assert_called_once_with(force_insert=True)
