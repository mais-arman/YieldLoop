from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from unittest.mock import patch

from audit.models import AuditEvent
from django.db import close_old_connections
from django.test import Client, TransactionTestCase
from django.utils import timezone

from .models import AuthRateBucket, User

PASSWORD = "Test-only-strong-phrase-948!"


class AuthFlowTests(TransactionTestCase):
    def setUp(self):
        self.manager = self.user("manager", "manager")
        self.operator = self.user("operator", "cutting_operator")

    def user(self, name, role):
        return User.objects.create_user(username=name, password=PASSWORD, role=role)

    def client_for(self, username=None):
        client = Client(enforce_csrf_checks=True)
        token = client.get("/api/v1/auth/csrf").json()["csrfToken"]
        client.defaults["HTTP_X_CSRFTOKEN"] = token
        if username:
            response = client.post("/api/v1/auth/login", {
                "username": username, "password": PASSWORD,
            }, content_type="application/json")
            self.assertEqual(response.status_code, 200, response.content)
            client.defaults["HTTP_X_CSRFTOKEN"] = response.json()["csrfToken"]
        return client

    def patch(self, client, user, values):
        return client.patch(f"/api/v1/employees/{user.pk}", values, content_type="application/json")

    def test_anonymous_csrf_invalid_disabled_and_unknown_login(self):
        self.assertEqual(Client().get("/api/v1/auth/me").status_code, 401)
        response = Client(enforce_csrf_checks=True).post("/api/v1/auth/login", {})
        self.assertEqual(response.status_code, 403)
        self.operator.is_active = False
        self.operator.save()
        client = self.client_for()
        for username, password in [("missing", PASSWORD), ("manager", "wrong"), ("operator", PASSWORD)]:
            response = client.post("/api/v1/auth/login", {
                "username": username, "password": password,
            }, content_type="application/json")
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json()["code"], "invalid_credentials")

    def test_fixation_cookie_logout_and_csrf(self):
        client = self.client_for()
        session = client.session
        session["old"] = True
        session.save()
        old = session.session_key
        response = client.post("/api/v1/auth/login", {
            "username": "manager", "password": PASSWORD,
        }, content_type="application/json")
        self.assertNotEqual(old, client.session.session_key)
        cookie = response.cookies["yieldloop_session"]
        self.assertTrue(cookie["httponly"])
        self.assertTrue(cookie["secure"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertFalse(cookie["domain"])
        client.defaults["HTTP_X_CSRFTOKEN"] = response.json()["csrfToken"]
        saved = cookie.value
        self.assertEqual(client.post("/api/v1/auth/logout").status_code, 200)
        client.cookies["yieldloop_session"] = saved
        self.assertEqual(client.get("/api/v1/auth/me").status_code, 401)

    def test_all_roles_and_privilege_injection(self):
        self.user("supervisor", "production_supervisor")
        for name in ["operator", "supervisor"]:
            client = self.client_for(name)
            self.assertEqual(client.get("/api/v1/employees").status_code, 403)
            self.assertEqual(self.patch(client, self.operator, {"role": "manager"}).status_code, 403)
        manager = self.client_for("manager")
        self.assertEqual(manager.get("/api/v1/employees").status_code, 200)
        self.assertEqual(self.patch(manager, self.operator, {"is_superuser": True}).status_code, 400)
        self.assertEqual(self.patch(manager, self.manager, {"role": "cutting_operator"}).status_code, 403)
        self.assertEqual(self.patch(manager, self.manager, {"is_active": False}).status_code, 403)

    def test_create_temporary_replace_and_no_secret_response(self):
        manager = self.client_for("manager")
        response = manager.post("/api/v1/employees", {
            "username": "employee", "role": "production_supervisor", "temporary_password": PASSWORD,
        }, content_type="application/json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertNotIn("password", response.json())
        self.assertNotIn(PASSWORD, response.content.decode())
        employee = self.client_for("employee")
        self.assertEqual(employee.get("/api/v1/employees").json()["code"], "password_change_required")
        response = employee.post("/api/v1/auth/password", {
            "current_password": PASSWORD, "new_password": "Different-test-phrase-948!",
        }, content_type="application/json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(employee.get("/api/v1/auth/me").status_code, 401)
        self.assertFalse(User.objects.get(username="employee").must_change_password)
        self.assertEqual(AuditEvent.objects.count(), 2)

    def test_expired_temporary_and_session_deadline(self):
        self.operator.must_change_password = True
        self.operator.temporary_password_expires_at = timezone.now() - timedelta(seconds=1)
        self.operator.save()
        client = self.client_for()
        self.assertEqual(client.post("/api/v1/auth/login", {
            "username": "operator", "password": PASSWORD,
        }, content_type="application/json").status_code, 401)
        manager = self.client_for("manager")
        session = manager.session
        session["absolute_expiry"] = 1
        session.save()
        self.assertEqual(manager.get("/api/v1/auth/me").status_code, 401)

    def test_role_activation_reset_revoke_existing_sessions(self):
        manager = self.client_for("manager")
        operator = self.client_for("operator")
        self.assertEqual(self.patch(manager, self.operator, {"role": "production_supervisor"}).status_code, 200)
        self.assertEqual(operator.get("/api/v1/auth/me").status_code, 401)
        operator = self.client_for("operator")
        self.assertEqual(self.patch(manager, self.operator, {"is_active": False}).status_code, 200)
        self.assertEqual(operator.get("/api/v1/auth/me").status_code, 401)
        self.patch(manager, self.operator, {"is_active": True})
        operator = self.client_for("operator")
        self.assertEqual(manager.post(f"/api/v1/employees/{self.operator.pk}/password", {
            "temporary_password": "Another-test-phrase-948!",
        }, content_type="application/json").status_code, 200)
        self.assertEqual(operator.get("/api/v1/auth/me").status_code, 401)
        for event in AuditEvent.objects.values():
            self.assertNotIn(PASSWORD, str(event))

    def test_shared_throttle_across_clients(self):
        for _ in range(10):
            client = self.client_for()
            self.assertEqual(client.post("/api/v1/auth/login", {
                "username": "manager", "password": "wrong",
            }, content_type="application/json").status_code, 401)
        response = self.client_for().post("/api/v1/auth/login", {
            "username": "manager", "password": PASSWORD,
        }, content_type="application/json")
        self.assertEqual(response.status_code, 429)
        self.assertGreater(AuthRateBucket.objects.count(), 0)

    def test_unsafe_csrf_and_untrusted_origin(self):
        client = self.client_for("manager")
        del client.defaults["HTTP_X_CSRFTOKEN"]
        for path in ["/api/v1/auth/logout", "/api/v1/auth/password", "/api/v1/employees"]:
            self.assertEqual(client.post(path, {}, content_type="application/json").status_code, 403)
        client.defaults["HTTP_X_CSRFTOKEN"] = client.get("/api/v1/auth/csrf").json()["csrfToken"]
        self.assertEqual(client.post("/api/v1/auth/logout", HTTP_ORIGIN="https://evil.invalid").status_code, 403)

    def test_expiry_during_replacement_and_audit_rollback(self):
        self.operator.must_change_password = True
        self.operator.temporary_password_expires_at = timezone.now() + timedelta(hours=1)
        self.operator.save()
        employee = self.client_for("operator")
        self.operator.temporary_password_expires_at = timezone.now() - timedelta(seconds=1)
        self.operator.save()
        response = employee.post("/api/v1/auth/password", {
            "current_password": PASSWORD, "new_password": "Different-test-phrase-948!",
        }, content_type="application/json")
        self.assertEqual(response.json()["code"], "temporary_password_expired")
        manager = self.client_for("manager")
        with (
            patch("accounts.services.audit", side_effect=RuntimeError("audit unavailable")),
            self.assertRaises(RuntimeError),
        ):
            self.patch(manager, self.operator, {"role": "manager"})
        self.operator.refresh_from_db()
        self.assertEqual(self.operator.role, "cutting_operator")

    def test_concurrent_managers_cannot_remove_each_other(self):
        other = self.user("manager2", "manager")
        first, second = self.client_for("manager"), self.client_for("manager2")

        def demote(client, target):
            close_old_connections()
            try:
                return self.patch(client, target, {"role": "cutting_operator"}).status_code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            a = pool.submit(demote, first, other)
            b = pool.submit(demote, second, self.manager)
            results = [a.result(), b.result()]
        self.assertEqual(results.count(200), 1, results)
        self.assertEqual(User.objects.filter(role="manager", is_active=True).count(), 1)
