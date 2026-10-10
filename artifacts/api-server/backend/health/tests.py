from unittest.mock import patch

from django.db import OperationalError
from django.test import SimpleTestCase, override_settings


class HealthTests(SimpleTestCase):
    def test_liveness_does_not_access_database(self):
        with patch("health.views.connection") as connection:
            response = self.client.get("/api/healthz")
        connection.cursor.assert_not_called()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})
        self.assertIn("no-store", response.headers["Cache-Control"])

    @override_settings(DATABASE_CONFIGURED=True)
    def test_ready_queries_postgres(self):
        with patch("health.views.connection") as connection:
            cursor = connection.cursor.return_value.__enter__.return_value
            cursor.fetchone.return_value = (1,)
            response = self.client.get("/api/v1/health/ready")
        cursor.execute.assert_called_once_with("SELECT 1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ready", "database": "connected"})

    @override_settings(DATABASE_CONFIGURED=True)
    def test_unavailable_database_is_safe(self):
        with patch("health.views.connection") as connection:
            connection.cursor.side_effect = OperationalError("sensitive connection details")
            response = self.client.get("/api/v1/health/ready")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "unavailable", "database": "unavailable"})
        self.assertNotIn(b"sensitive", response.content)
        self.assertIn("no-store", response.headers["Cache-Control"])

    @override_settings(DATABASE_CONFIGURED=False)
    def test_missing_configuration_does_not_connect(self):
        with patch("health.views.connection") as connection:
            response = self.client.get("/api/v1/health/ready")
        connection.cursor.assert_not_called()
        self.assertEqual(response.status_code, 503)

    @override_settings(DATABASE_CONFIGURED=True)
    def test_unexpected_query_result_is_not_ready(self):
        with patch("health.views.connection") as connection:
            connection.cursor.return_value.__enter__.return_value.fetchone.return_value = None
            response = self.client.get("/api/v1/health/ready")
        self.assertEqual(response.status_code, 503)

    def test_mutations_are_not_allowed(self):
        for path in ("/api/healthz", "/api/v1/health/ready"):
            self.assertEqual(self.client.post(path).status_code, 405)

    def test_unknown_routes_are_not_business_endpoints(self):
        self.assertEqual(self.client.get("/api/v1/jobs").status_code, 404)
