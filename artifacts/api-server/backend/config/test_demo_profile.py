import os
import subprocess
import sys
from pathlib import Path

from django.test import SimpleTestCase


class DemoProfileTests(SimpleTestCase):
    def run_profile(self, production=False, deployment=False):
        env = {**os.environ, "DJANGO_SETTINGS_MODULE": "config.demo_settings",
               "DJANGO_ENV": "production" if production else "development",
               "DJANGO_SECRET_KEY": "isolated-profile-test-" * 4,
               "DJANGO_ALLOWED_HOSTS": "example.invalid",
               "DATABASE_URL": "postgresql://unused:unused@localhost/unused?sslmode=verify-full"}
        env.pop("REPLIT_DEPLOYMENT", None)
        if deployment:
            env["REPLIT_DEPLOYMENT"] = "1"
        return subprocess.run([sys.executable, "-c",
            ("from django.conf import settings as s; "
            "assert s.DEMO_SCHEMA == 'yieldloop_preview_demo'; "
            "assert 'search_path=yieldloop_preview_demo' in s.DATABASES['default']['OPTIONS']['options']; "
            "assert not getattr(s, 'TESTING', False); "
            "assert all('MD5' not in h for h in s.PASSWORD_HASHERS); "
            "assert s.SESSION_COOKIE_SECURE")],
            check=False, cwd=Path(__file__).resolve().parents[1], env=env, capture_output=True, timeout=15)

    def test_development_retains_secure_auth_and_isolates_schema(self):
        self.assertEqual(self.run_profile().returncode, 0)

    def test_production_rejected(self):
        self.assertNotEqual(self.run_profile(production=True).returncode, 0)

    def test_deployment_rejected(self):
        self.assertNotEqual(self.run_profile(deployment=True).returncode, 0)
