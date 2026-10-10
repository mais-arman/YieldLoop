"""Connections start read-only. Only the positively identified dev target may write."""
import os

from django.conf import settings


def approve_development_connection(sender, connection, **kwargs):
    if connection.vendor != "postgresql":
        return
    if getattr(settings, "ENVIRONMENT", "") != "development" or os.environ.get("REPLIT_DEPLOYMENT") == "1":
        return
    expected_db = os.environ.get("YIELDLOOP_DEV_DATABASE")
    expected_cluster = os.environ.get("YIELDLOOP_DEV_CLUSTER")
    if not expected_db or not expected_cluster:
        return
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database(), system_identifier::text FROM pg_control_system()")
        name, cluster = cursor.fetchone()
        allowed = {expected_db}
        if getattr(settings, "TESTING", False):
            allowed = {"test_yieldloop_phase2b"}
        if name in allowed and cluster == expected_cluster:
            cursor.execute("SET default_transaction_read_only = off")
