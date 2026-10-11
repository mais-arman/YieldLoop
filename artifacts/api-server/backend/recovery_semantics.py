"""Fail-closed comparison of CHECK metadata and narrow enum cast rewrites.

All behavioral DDL/DML is restricted to temporary tables on the disposable
restore database. No public/application constraint is removed or altered.
"""
import re

import psycopg
from psycopg import sql


def enum_signature(definition):
    """Recognize only PostgreSQL's two equivalent varchar-array -> text forms."""
    match = re.fullmatch(
        r"CHECK \(\(\((\w+)\)::text = ANY \((.*)\)\)\)", definition
    )
    if not match:
        return None
    column, body = match.groups()
    if body.startswith("(ARRAY[") and body.endswith("])::text[]"):
        items = body[len("(ARRAY["):-len("])::text[]")].split(", ")
        pattern = r"'([a-z_]+)'::character varying"
    elif body.startswith("ARRAY[") and body.endswith("]"):
        items = body[len("ARRAY["):-1].split(", ")
        pattern = r"\('([a-z_]+)'::character varying\)::text"
    else:
        return None
    values = [re.fullmatch(pattern, item) for item in items]
    if not values or not all(values):
        return None
    return column, tuple(value[1] for value in values)


def catalog(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT c.relname,k.conname,k.contype,k.convalidated,
                   k.condeferrable,k.condeferred,k.connoinherit,
                   ARRAY(SELECT a.attname FROM unnest(k.conkey) WITH ORDINALITY x(n,ord)
                         JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=x.n ORDER BY ord),
                   pg_get_constraintdef(k.oid)
            FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
            JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' ORDER BY c.relname,k.conname
        """)
        constraints = {(r[0], r[1]): r[2:] for r in cur.fetchall()}
        cur.execute("""
            SELECT c.relname,a.attname,format_type(a.atttypid,a.atttypmod),
                   a.attnotnull,co.collname,a.attgenerated,a.attidentity
            FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
            JOIN pg_namespace n ON n.oid=c.relnamespace
            LEFT JOIN pg_collation co ON co.oid=a.attcollation
            WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped
        """)
        columns = {(r[0], r[1]): r[2:] for r in cur.fetchall()}
    return constraints, columns


def probe(conn, column, column_type, definition, required, values):
    # Each probe is rolled back, including successful inserts/updates and DDL.
    results = []
    with conn.transaction(force_rollback=True), conn.cursor() as cur:
        cur.execute(sql.SQL("CREATE TEMP TABLE recovery_probe ({} {}, {})").format(
            sql.Identifier(column), sql.SQL(column_type), sql.SQL(definition)))
        if required:
            cur.execute(sql.SQL("ALTER TABLE recovery_probe ALTER COLUMN {} SET NOT NULL")
                        .format(sql.Identifier(column)))
        for value, expected in values:
            for operation in ("insert", "update"):
                try:
                    with conn.transaction(force_rollback=True):
                        if operation == "update":
                            cur.execute(sql.SQL("INSERT INTO recovery_probe ({}) VALUES (%s)")
                                        .format(sql.Identifier(column)), [values[0][0]])
                            cur.execute(sql.SQL("UPDATE recovery_probe SET {}=%s")
                                        .format(sql.Identifier(column)), [value])
                        else:
                            cur.execute(sql.SQL("INSERT INTO recovery_probe ({}) VALUES (%s)")
                                        .format(sql.Identifier(column)), [value])
                    outcome = "accepted"
                except psycopg.IntegrityError as exc:
                    outcome = exc.sqlstate
                assert outcome == expected, (column, operation, repr(value), expected, outcome)
                results.append(outcome)
    return results


def verify(source, restored):
    with restored.cursor() as cur:
        cur.execute("SELECT current_database()")
        assert cur.fetchone()[0] == "test_yieldloop_restore_drill"
    locales = []
    for conn in (source, restored):
        with conn.cursor() as cur:
            cur.execute("SELECT datcollate,datctype,datlocprovider,datcollversion "
                        "FROM pg_database WHERE datname=current_database()")
            locales.append(cur.fetchone())
    assert locales[0] == locales[1], "Database collation/locale mismatch"
    original, columns = catalog(source)
    recovered, restored_columns = catalog(restored)
    assert columns == restored_columns, "Column type/nullability/collation/identity mismatch"
    assert original.keys() == recovered.keys(), "Constraint set mismatch"
    differences = []
    total = 0
    for key, left in original.items():
        right = recovered[key]
        assert left[:-1] == right[:-1], f"Constraint metadata mismatch: {key}"
        if left[-1] == right[-1]:
            continue
        signature = enum_signature(left[-1])
        assert signature and signature == enum_signature(right[-1]), f"Unrecognized change: {key}"
        assert left[0] == "c" and left[1] is True
        column, accepted = signature
        assert left[-2] == [column], f"Unexpected referenced columns: {key}"
        column_type, not_null, *_ = columns[key[0], column]
        for required in (False, not_null):
            cases = [(v, "accepted") for v in accepted]
            cases += [(v, "23514") for v in ("", "invalid", "NULL", accepted[0].upper(),
                                           " " + accepted[0], accepted[0] + " ", "\t")]
            cases += [(None, "23502" if required else "accepted")]
            outcomes = [probe(restored, column, column_type, definition, required, cases)
                        for definition in (left[-1], right[-1])]
            assert outcomes[0] == outcomes[1]
            total += sum(map(len, outcomes))
        differences.append({"table": key[0], "constraint": key[1], "column": column,
                            "validated": left[1], "not_null": not_null,
                            "accepted": accepted, "source": left[-1], "restored": right[-1]})
    assert differences, "Expected cast rewrite coverage absent; investigate rather than skip"
    # Negative controls: altered allowed set/operator must not be normalized away.
    sample = differences[0]["source"]
    assert enum_signature(sample.replace(" = ANY ", " <> ANY ")) is None
    assert enum_signature(sample.replace("'manager'", "'intruder'")) != enum_signature(sample)
    return {"constraints": len(original), "check_constraints": sum(v[0] == "c" for v in original.values()),
            "validated_checks": sum(v[0] == "c" and v[1] for v in original.values()),
            "database_locale_equal": True,
            "columns": len(columns), "behavioral_statements": total,
            "negative_controls": 2, "rewrites": differences}
