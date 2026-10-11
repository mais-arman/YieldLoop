"""Non-destructive PostgreSQL test isolation: a fresh retained schema per test.

No database creation/deletion, flush, truncate, or production target. Schemas are
retained as disposable test evidence; their names are printed, never credentials.
"""
# ruff: noqa: I001
# Django setup must precede model-dependent runner imports.
import os
import sys
import uuid
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.test_settings")
import django
django.setup()
from django.conf import settings
from django.core.management import call_command
from django.db import connection, connections
from django.test import TransactionTestCase
from django.test.runner import DiscoverRunner

PREFIX = "ylpilot_" + uuid.uuid4().hex[:12]
BASE_OPTIONS = dict(connection.settings_dict.get("OPTIONS", {}))
COUNT = 0


def verify_target():
    assert settings.SETTINGS_MODULE == "config.test_settings"
    assert settings.TESTING and settings.ENVIRONMENT == "development"
    assert not os.environ.get("REPLIT_DEPLOYMENT")
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database(), system_identifier::text FROM pg_control_system()")
        assert cursor.fetchone() == ("test_yieldloop_phase2b", "7694975907574124564")


def setup_fixture(self):
    global COUNT
    COUNT += 1
    schema = f"{PREFIX}_{COUNT}"
    connections.close_all()
    connection.settings_dict["OPTIONS"] = dict(BASE_OPTIONS)
    verify_target()
    with connection.cursor() as cursor:
        cursor.execute(f'CREATE SCHEMA "{schema}"')
    connections.close_all()
    # Every thread opens into the same test-specific schema, including migrations.
    connection.settings_dict["OPTIONS"] = {
        **BASE_OPTIONS, "options": BASE_OPTIONS.get("options", "") + f" -c search_path={schema}"}
    call_command("migrate", interactive=False, verbosity=0)


def teardown_fixture(self):
    connections.close_all()
    connection.settings_dict["OPTIONS"] = dict(BASE_OPTIONS)


class Runner(DiscoverRunner):
    def setup_databases(self, **kwargs):
        verify_target()

    def teardown_databases(self, old_config, **kwargs):
        connections.close_all()


if __name__ == "__main__":
    TransactionTestCase._fixture_setup = classmethod(setup_fixture)
    TransactionTestCase._fixture_teardown = teardown_fixture
    print("Retained isolated test schema prefix:", PREFIX, flush=True)
    failures = Runner(verbosity=2).run_tests(sys.argv[1:] or ["materials.test_integrated"])
    print("Retained schemas:", COUNT, "prefix:", PREFIX, flush=True)
    raise SystemExit(bool(failures))
