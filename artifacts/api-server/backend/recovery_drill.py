"""Synthetic PostgreSQL recovery drill; fixed non-production targets only.

Stop the isolated browser harness before running. Refuses an existing restore
database. Never changes the application write guard or reads production data.
"""
import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path

os.environ["DJANGO_SETTINGS_MODULE"] = "config.test_settings"

import django

django.setup()

import psycopg
from django.conf import settings
from django.db import connection
from psycopg import sql

SOURCE = "test_yieldloop_phase2b"
TARGET = "test_yieldloop_restore_drill"


def fingerprint(conn):
    """Hash every public table, sequence and constraint without printing row data."""
    result = {}
    with conn.cursor() as cur:
        cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
        for (table,) in cur.fetchall():
            cur.execute(sql.SQL("SELECT row_to_json(t)::text FROM {} t ORDER BY row_to_json(t)::text")
                        .format(sql.Identifier("public", table)))
            rows = [r[0] for r in cur.fetchall()]
            result[table] = [len(rows), hashlib.sha256("\n".join(rows).encode()).hexdigest()]
        cur.execute("SELECT sequencename,last_value,start_value,increment_by FROM pg_sequences "
                    "WHERE schemaname='public' ORDER BY sequencename")
        result["_sequences"] = cur.fetchall()
        cur.execute("SELECT c.relname,conname,pg_get_constraintdef(k.oid) FROM pg_constraint k "
                    "JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace "
                    "WHERE n.nspname='public' ORDER BY c.relname,conname")
        result["_constraints"] = sorted(cur.fetchall())
    return result


def main():
    assert settings.TESTING and settings.ENVIRONMENT == "development"
    assert os.environ.get("REPLIT_DEPLOYMENT") != "1"
    with connection.cursor() as cur:
        cur.execute("SELECT current_database(),system_identifier::text FROM pg_control_system()")
        database, cluster = cur.fetchone()
        assert database == SOURCE and cluster == os.environ["YIELDLOOP_DEV_CLUSTER"]
        cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", [TARGET])
        assert cur.fetchone() is None, "Existing restore database: refusing to overwrite."
    source = connection.connection
    before = fingerprint(source)
    assert before.get("jobs_productionjob", [0])[0] > 0, "Synthetic jobs required before drill."
    # Credentials are forwarded in the child environment, never command arguments
    # or output. No dump is made from the application/development database.
    info = source.info
    child_env = {**os.environ, "PGHOST": info.host, "PGPORT": str(info.port),
                 "PGUSER": info.user, "PGPASSWORD": info.password or "", "PGDATABASE": SOURCE}
    created = False
    try:
        with tempfile.TemporaryDirectory(prefix="yieldloop-recovery-") as directory:
            dump = Path(directory) / "synthetic.dump"
            dump.touch(mode=0o600)
            def run(args):
                completed = subprocess.run(args, env=child_env, capture_output=True, check=False)
                if completed.returncode:
                    diagnostic = completed.stderr.decode(errors="replace")
                    categories = [text for text in ("read-only transaction", "permission denied",
                                  "transaction_timeout", "already exists", "authentication failed",
                                  "connection refused", "not found") if text in diagnostic]
                    raise RuntimeError(f"{args[0]} failed ({','.join(categories) or 'unclassified'}); "
                                       "raw output withheld to protect connection details.")
            run(["pg_dump", "--format=custom", "--no-owner", "--no-acl", "--file", str(dump)])
            with connection.cursor() as cur:
                cur.execute(sql.SQL("CREATE DATABASE {} TEMPLATE template0").format(sql.Identifier(TARGET)))
                created = True
            child_env["PGDATABASE"] = TARGET
            # PostgreSQL 17's client emits this SET even for an older source.
            # Materialize SQL privately and omit only that unsupported session
            # setting for pre-17 servers; never ignore restore/schema errors.
            if source.info.server_version < 170000:
                restore_sql = Path(directory) / "restore.sql"
                restore_sql.touch(mode=0o600)
                run(["pg_restore", "--no-owner", "--no-acl", "--file", str(restore_sql), str(dump)])
                text = restore_sql.read_text()
                assert text.count("SET transaction_timeout = 0;\n") == 1
                restore_sql.write_text(text.replace("SET transaction_timeout = 0;\n", "", 1))
                run(["psql", "--no-psqlrc", "--single-transaction", "--set", "ON_ERROR_STOP=1",
                     "--file", str(restore_sql)])
                print("Compatibility: omitted only PostgreSQL 17 transaction_timeout SET for pre-17 server.")
            else:
                run(["pg_restore", "--exit-on-error", "--single-transaction", "--no-owner", "--no-acl",
                     "--dbname", TARGET, str(dump)])
            params = connection.get_connection_params()
            params["dbname"] = TARGET
            with psycopg.connect(**params) as restored:
                with restored.cursor() as cur:
                    cur.execute("SELECT current_database(),system_identifier::text FROM pg_control_system()")
                    assert cur.fetchone() == (TARGET, cluster)
                after = fingerprint(restored)
            mismatches = [key for key in before if before[key] != after.get(key)]
            if "_constraints" in mismatches:
                print(json.dumps({"result": "BLOCKED", "tables": len(before) - 2,
                                  "rows": sum(v[0] for k, v in before.items() if not k.startswith("_")),
                                  "table_rows_equal": not any(k for k in mismatches if not k.startswith("_")),
                                  "sequences_equal": "_sequences" not in mismatches,
                                  "constraint_text_equal": False}))
            assert not mismatches, f"Restored fingerprint mismatch in: {','.join(mismatches)}"
            assert fingerprint(source) == before, "Source changed during drill."
            print(json.dumps({"result": "PASS", "source": SOURCE, "destination": TARGET,
                              "tables": len(before) - 2,
                              "rows": sum(v[0] for k, v in before.items() if not k.startswith("_")),
                              "constraints": len(before["_constraints"]),
                              "sequences": len(before["_sequences"]),
                              "dump_bytes": dump.stat().st_size,
                              "row_hashes_schema_sequences_equal": True, "source_unchanged": True}))
    finally:
        if created:
            with connection.cursor() as cur:
                cur.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(TARGET)))
            print("Removed isolated restore database and temporary synthetic archive.")


if __name__ == "__main__":
    main()
