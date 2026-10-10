import os
import subprocess
import sys
from pathlib import Path
from unittest import TestCase


class SettingsTests(TestCase):
    def check_settings(self, values):
        # Never inherit database credentials or secret settings into these cases.
        env = {
            key: value for key, value in os.environ.items()
            if not key.startswith(("DJANGO_", "PG")) and key != "DATABASE_URL"
        }
        env.update(values)
        return subprocess.run(
            [sys.executable, "-c", "import config.settings"],
            cwd=Path(__file__).resolve().parents[1],
            env=env, capture_output=True, text=True, check=False,
        )

    def test_development_without_database_can_boot(self):
        self.assertEqual(self.check_settings({}).returncode, 0)

    def test_production_missing_secret_fails(self):
        result = self.check_settings({"DJANGO_ENV": "production"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("requires DJANGO_SECRET_KEY", result.stderr)

    def test_non_postgresql_rejected(self):
        result = self.check_settings({"DATABASE_URL": "sqlite:///unused"})
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Only PostgreSQL", result.stderr)

    def test_malformed_url_does_not_echo_credentials(self):
        result = self.check_settings({"DATABASE_URL": "invalid://sensitive-example"})
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("sensitive-example", result.stderr)

    def test_production_missing_hosts_fails(self):
        result = self.check_settings({
            "DJANGO_ENV": "production", "DJANGO_SECRET_KEY": "test-only-" * 8,
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("explicit DJANGO_ALLOWED_HOSTS", result.stderr)

    def test_production_missing_database_fails(self):
        result = self.check_settings({
            "DJANGO_ENV": "production", "DJANGO_SECRET_KEY": "test-only-" * 8,
            "DJANGO_ALLOWED_HOSTS": "example.invalid",
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("requires DATABASE_URL", result.stderr)

    def test_production_requires_verified_tls(self):
        result = self.check_settings({
            "DJANGO_ENV": "production", "DJANGO_SECRET_KEY": "test-only-" * 8,
            "DJANGO_ALLOWED_HOSTS": "example.invalid",
            "DATABASE_URL": "postgresql://example.invalid/unused?sslmode=disable",
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("verified TLS", result.stderr)
