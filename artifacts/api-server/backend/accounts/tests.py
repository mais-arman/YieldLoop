from unittest.mock import MagicMock, patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.test import SimpleTestCase, override_settings

from .database_guard import approve_development_connection
from .models import User


class UserSchemaTests(SimpleTestCase):
    def test_custom_user_and_exact_roles(self):
        self.assertIs(get_user_model(), User)
        self.assertEqual(set(User.Role.values), {
            "cutting_operator", "production_supervisor", "manager",
        })
        self.assertFalse(User._meta.get_field("role").has_default())
        with self.assertRaises(ValidationError):
            User(role="admin").clean_fields(exclude=["password"])

    def test_password_is_hashed_and_version_changes_session_hash(self):
        user = User(username="offline", role=User.Role.MANAGER)
        user.set_password("unit-test-only-long-passphrase")
        self.assertNotEqual(user.password, "unit-test-only-long-passphrase")
        self.assertTrue(user.check_password("unit-test-only-long-passphrase"))
        self.assertFalse(user.check_password("incorrect"))
        original = user.get_session_auth_hash()
        user.session_version += 1
        self.assertNotEqual(original, user.get_session_auth_hash())

    def test_password_change_invalidates_hash(self):
        user = User(password="first-encoded-password")
        original = user.get_session_auth_hash()
        user.password = "second-encoded-password"
        self.assertNotEqual(original, user.get_session_auth_hash())

    @override_settings(SECRET_KEY="new-offline-key", SECRET_KEY_FALLBACKS=["old-offline-key"])
    def test_key_rotation_fallback_includes_session_version(self):
        user = User(password="encoded-password", session_version=2)
        old = user._get_session_auth_hash(secret="old-offline-key")
        self.assertEqual(list(user.get_session_auth_fallback_hash()), [old])
        self.assertNotEqual(old, user.get_session_auth_hash())
        user.session_version += 1
        self.assertNotIn(old, list(user.get_session_auth_fallback_hash()))

    def test_password_validators_reject_weak_passwords(self):
        with self.assertRaises(ValidationError):
            validate_password("123")

    def test_offline_database_cannot_be_used(self):
        self.assertEqual(settings.DATABASES["default"]["ENGINE"], "django.db.backends.dummy")
        # The dummy backend fails even before an actual connection can open.
        with self.assertRaises(ImproperlyConfigured):
            User.objects.count()

    def test_prepared_cookie_and_session_policy(self):
        self.assertEqual(settings.SESSION_ENGINE, "django.contrib.sessions.backends.db")
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)
        self.assertTrue(settings.SESSION_COOKIE_SECURE)
        self.assertTrue(settings.CSRF_COOKIE_SECURE)
        self.assertIsNone(settings.SESSION_COOKIE_DOMAIN)
        self.assertEqual(settings.SESSION_COOKIE_SAMESITE, "Lax")
        self.assertFalse(settings.SESSION_SAVE_EVERY_REQUEST)
        self.assertEqual(settings.CSRF_TRUSTED_ORIGINS, [])

    @override_settings(ENVIRONMENT="development", TESTING=False)
    def test_write_guard_requires_exact_cluster_and_database(self):
        with patch.dict("os.environ", {
            "YIELDLOOP_DEV_DATABASE": "approved_dev", "YIELDLOOP_DEV_CLUSTER": "123",
            "REPLIT_DEPLOYMENT": "0",
        }):
            for target, expected in [
                (("approved_dev", "123"), True),
                (("other_database", "123"), False),
                (("approved_dev", "456"), False),
            ]:
                connection = MagicMock(vendor="postgresql")
                cursor = connection.cursor.return_value.__enter__.return_value
                cursor.fetchone.return_value = target
                approve_development_connection(None, connection)
                writes = [call for call in cursor.execute.call_args_list if " = off" in call.args[0]]
                self.assertEqual(bool(writes), expected)

    @override_settings(ENVIRONMENT="production")
    def test_write_guard_never_enables_production(self):
        connection = MagicMock(vendor="postgresql")
        approve_development_connection(None, connection)
        connection.cursor.assert_not_called()
