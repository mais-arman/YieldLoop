"""Guarded additive Preview migration and unchanged-business-data verification.

Run with config.demo_settings. --migrate applies only jobs/0003; no seed or reset.
"""
import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "artifacts/api-server/backend"))
import django
django.setup()
from django.apps import apps
from django.conf import settings
from django.core.management import call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from jobs.demo import verify_target, verify_case, CASES
from jobs.models import ProductionJob


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--migrate", action="store_true")
    args = parser.parse_args()
    assert settings.SETTINGS_MODULE == "config.demo_settings"
    verify_target(os.environ.get("YIELDLOOP_DEV_DATABASE"), os.environ.get("YIELDLOOP_DEV_CLUSTER"))
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_schema(), current_setting('transaction_read_only')")
        schema, read_only = cursor.fetchone()
        assert schema == "yieldloop_preview_demo"
        if args.migrate:
            assert read_only == "off", "Existing write guard has not authorized this connection."
        cursor.execute("SELECT obj_description(oid, 'pg_namespace') FROM pg_namespace WHERE nspname = %s", [schema])
        assert cursor.fetchone()[0] == "YieldLoop Preview demo complete"
    print("Verified isolated development Preview target and schema; no production access.")
    excluded = ["product_specification", "sheet_width", "sheet_height", "sheet_unit",
                "planned_yield", "cutting_instructions", "old_card", "new_card"]
    def fingerprint():
        result = {}
        with connection.cursor() as cursor:
            for model in apps.get_models():
                if model._meta.app_label not in {"jobs", "materials", "inventory", "cutting", "audit"}:
                    continue
                table = connection.ops.quote_name(model._meta.db_table)
                cursor.execute(f"SELECT count(*), md5(COALESCE(jsonb_agg(to_jsonb(t) - %s::text[] ORDER BY id)::text, '[]')) FROM {table} t", [excluded])
                result[model._meta.db_table] = cursor.fetchone()
        return result
    before = fingerprint()
    target = ("jobs", "0003_production_planning_card")
    executor = MigrationExecutor(connection)
    plan = executor.migration_plan([target])
    assert all((migration.app_label, migration.name) == target and not backwards for migration, backwards in plan)
    if args.migrate:
        call_command("migrate", *target, interactive=False, verbosity=1)
    assert not MigrationExecutor(connection).migration_plan([target]), "Migration is pending."
    assert before == fingerprint(), "Existing business data changed."
    print(f"Existing business fingerprints unchanged across {len(before)} tables.")
    for reference, expected in CASES.items():
        job = ProductionJob.objects.get(reference=reference)
        verify_case(job, expected)
        assert job.sheet_width is None and job.sheet_height is None and job.planned_yield is None
        assert not job.product_specification and not job.cutting_instructions and not job.sheet_unit
        print(reference, "reference records preserved; planning fields unset.")
    print("PASS: migration compatibility and reference preservation.")


if __name__ == "__main__":
    main()
