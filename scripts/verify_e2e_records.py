"""Fingerprint existing Preview business rows before/after UI tests.

Stores only table names, numeric IDs and hashes in /tmp, not record contents.
New clearly-labelled QA records are allowed; missing/changed original rows fail.
"""
import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "artifacts/api-server/backend"))
import django
django.setup()
from django.apps import apps
from django.conf import settings
from django.db import connection
from jobs.demo import verify_target

parser = argparse.ArgumentParser()
parser.add_argument("action", choices=["capture", "verify"])
parser.add_argument("evidence")
args = parser.parse_args()
path = Path(args.evidence)
assert path.parent == Path("/tmp") and path.name.startswith("yieldloop-e2e-")
assert settings.SETTINGS_MODULE == "config.demo_settings"
verify_target(os.environ.get("YIELDLOOP_DEV_DATABASE"), os.environ.get("YIELDLOOP_DEV_CLUSTER"))
with connection.cursor() as cursor:
    cursor.execute("SELECT current_schema()")
    assert cursor.fetchone()[0] == "yieldloop_preview_demo"
    rows = {}
    for model in apps.get_models():
        if model._meta.app_label not in {"jobs", "materials", "inventory", "cutting", "audit"}:
            continue
        table = model._meta.db_table
        cursor.execute(f"SELECT id, md5(to_jsonb(t)::text) FROM {connection.ops.quote_name(table)} t ORDER BY id")
        rows[table] = {str(pk): digest for pk, digest in cursor.fetchall()}
if args.action == "capture":
    with path.open("x") as out:
        json.dump(rows, out)
    print("Captured", sum(map(len, rows.values())), "business rows across", len(rows), "tables; hashes only.")
else:
    original = json.loads(path.read_text())
    changed = [(table, pk) for table, records in original.items()
               for pk, digest in records.items() if rows.get(table, {}).get(pk) != digest]
    assert not changed, f"Original rows changed/missing: {changed}"
    print("PASS: all", sum(map(len, original.values())), "original business rows unchanged.")
    print("New test rows retained:", sum(len(rows[t]) - len(original[t]) for t in original))
