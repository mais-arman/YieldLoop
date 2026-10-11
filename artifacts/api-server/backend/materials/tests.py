import uuid
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from accounts.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, close_old_connections, transaction
from django.test import Client, SimpleTestCase, TransactionTestCase
from django.utils import timezone
from jobs.models import ProductionJob
from rest_framework.exceptions import ValidationError as ApiValidationError

from .accounting import calculate
from .models import Material, MaterialEntry, MaterialVoid, Reconciliation

PASSWORD = "Isolated-test-only-952!password"


class ArithmeticTests(SimpleTestCase):
    def test_exact_quantities_and_zero_denominator(self):
        entries = [
            SimpleNamespace(kind=kind, quantity=Decimal(qty), material_id=1, unit="kg")
            for kind, qty in [("issue", "0.300"), ("good", "0.100"), ("scrap", "0.200")]
        ]
        result = calculate(entries, 1)
        self.assertEqual(result["variance"], Decimal("0.000"))
        self.assertEqual(result["yield_rate"], Decimal("33.333"))
        self.assertEqual(result["scrap_rate"], Decimal("66.667"))
        empty = calculate([], 1)
        self.assertIsNone(empty["yield_rate"])
        self.assertIsNone(empty["scrap_rate"])
        self.assertEqual(empty["issued"], 0)

    def test_mixed_units_or_material_rejected(self):
        for material_id, unit in [(2, "kg"), (1, "g"), (1, "m2")]:
            with self.assertRaises(ApiValidationError):
                calculate([SimpleNamespace(kind="good", quantity=Decimal(1), material_id=material_id, unit=unit)], 1)


class MaterialTests(TransactionTestCase):
    def setUp(self):
        self.users = {
            role: User.objects.create_user(username=role, password=PASSWORD, role=role)
            for role in User.Role.values
        }
        self.manager = self.client_for("manager")
        self.supervisor = self.client_for("production_supervisor")
        self.operator = self.client_for("cutting_operator")
        self.job = ProductionJob.objects.create(title="Material test", status="open", created_by=self.users["manager"])
        self.material = Material.objects.create(
            name="Test paper", specification="Uncoated stock", unit="kg", created_by=self.users["manager"],
        )
        self.url = f"/api/v1/jobs/{self.job.pk}/materials"

    def client_for(self, role):
        client = Client(enforce_csrf_checks=True)
        token = client.get("/api/v1/auth/csrf").json()["csrfToken"]
        response = client.post("/api/v1/auth/login", {
            "username": role, "password": PASSWORD,
        }, content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)
        client.defaults["HTTP_X_CSRFTOKEN"] = response.json()["csrfToken"]
        return client

    def current(self, client=None, url=None):
        response = (client or self.manager).get(url or self.url)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def payload(self, kind="issue", quantity="1200.000", **overrides):
        state = self.current()
        return {
            "revision": state["revision"], "job_revision": state["job_revision"],
            "material_id": self.material.pk, "unit": "kg", "kind": kind, "quantity": quantity,
            "request_id": str(uuid.uuid4()), **overrides,
        }

    def add(self, kind="issue", quantity="1200.000", client=None, **overrides):
        return (client or self.manager).post(
            f"{self.url}/entries", self.payload(kind, quantity, **overrides), content_type="application/json",
        )

    def record(self, kind="issue", quantity="1200.000", client=None):
        response = self.add(kind, quantity, client=client)
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def void(self, pk, client=None, **overrides):
        current = self.current()
        return (client or self.manager).post(
            f"{self.url}/entries/{pk}/void",
            {"revision": current["revision"], "job_revision": current["job_revision"],
             "reason": "Measured incorrectly", **overrides}, content_type="application/json",
        )

    def test_reference_example_persisted_inputs_results_and_audit(self):
        self.record()
        self.record("good", "900")
        self.record("scrap", "180")
        self.record("scrap", "60")
        state = self.record("offcut", "60")
        summary = state["summary"]
        self.assertEqual({key: summary[key] for key in ("accounted", "variance", "yield_rate", "scrap_rate")},
                         {"accounted": "1200.000", "variance": "0.000", "yield_rate": "75.000", "scrap_rate": "20.000"})
        self.assertEqual(state["revision"], 5)
        self.assertEqual(Reconciliation.objects.filter(job=self.job).count(), 5)
        self.assertEqual(self.current(self.client_for("manager")), state)
        snapshot = Reconciliation.objects.first()
        self.assertEqual(snapshot.actor_id, self.users["manager"].pk)
        self.assertEqual(snapshot.offcut, Decimal(60))
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, "open")

    def test_second_reference_and_no_inferred_scrap(self):
        self.record(quantity="1000")
        self.record("good", "820")
        state = self.record("offcut", "80")
        self.assertEqual(state["summary"]["variance"], "100.000")
        self.assertEqual(state["summary"]["scrap"], "0.000")
        state = self.record("scrap", "100")
        self.assertEqual(state["summary"]["yield_rate"], "82.000")
        self.assertEqual(state["summary"]["scrap_rate"], "10.000")

    def test_over_accounting_remains_visible(self):
        self.record(quantity="1")
        state = self.record("good", "2")
        self.assertEqual(state["summary"]["variance"], "-1.000")
        self.assertEqual(state["summary"]["yield_rate"], "200.000")
        self.assertEqual(state["summary"]["scrap"], "0.000")

    def test_decimal_validation_and_strings_only(self):
        for value in ["0", "-1", "0.0001", "1.2345", "1000000000000", "NaN", "Infinity", "", None, 1.25, True]:
            self.assertEqual(self.add(quantity=value).status_code, 400, str(value))
        self.assertEqual(MaterialEntry.objects.count(), 0)
        self.record(quantity="999999999999.999")
        self.assertEqual(self.current()["summary"]["issued"], "999999999999.999")

    def test_exact_fractional_persistence(self):
        self.record(quantity="0.300")
        self.record("good", "0.100")
        state = self.record("scrap", "0.200")
        self.assertEqual(state["summary"]["variance"], "0.000")
        self.assertEqual(state["summary"]["yield_rate"], "33.333")

    def test_unit_material_first_issue_and_category(self):
        self.assertEqual(self.add(kind="good").json()["code"], "issue_required")
        for extra in [{"unit": "g"}, {"kind": "rework"}, {"kind": "other"}, {"material_id": 987654321}]:
            self.assertIn(self.add(**extra).status_code, [400, 404])
        self.record()
        other = Material.objects.create(name="Other", specification="Other", created_by=self.users["manager"])
        self.assertEqual(self.add(material_id=other.pk).json()["code"], "material_mismatch")

    def test_definition_permissions_identity_and_immutability(self):
        body = {"name": "Board", "specification": "Heavy", "unit": "kg"}
        for client in (self.supervisor, self.operator):
            self.assertEqual(client.post("/api/v1/materials", body, content_type="application/json").status_code, 403)
        self.assertEqual(self.manager.post("/api/v1/materials", body, content_type="application/json").status_code, 201)
        self.assertEqual(self.manager.post("/api/v1/materials", {**body, "name": "BOARD"}, content_type="application/json").status_code, 409)
        self.assertEqual(self.manager.post("/api/v1/materials", {**body, "created_by": 1}, content_type="application/json").status_code, 400)
        self.material.name = "Changed"
        with self.assertRaises(ValidationError):
            self.material.save()
        with self.assertRaises(ValidationError):
            Material.objects.filter(pk=self.material.pk).update(unit="g")

    def test_supervisor_and_operator_recording_and_scope(self):
        state = self.record(client=self.supervisor)
        self.assertEqual(self.current(self.operator)["summary"]["issued"], "1200.000")
        added = self.add(client=self.operator)
        self.assertEqual(added.status_code, 201)
        pk = state["entries"]["results"][0]["id"]
        self.assertEqual(self.void(pk, client=self.operator).status_code, 200)
        self.assertEqual(self.void(added.json()["entries"]["results"][0]["id"], client=self.supervisor).status_code, 200)
        self.job.status = "cancelled"
        self.job.save()
        self.assertEqual(self.operator.get(self.url).status_code, 404)
        self.assertEqual(self.operator.get("/api/v1/materials").json()["count"], 1)
        for client in (self.manager, self.supervisor):
            self.assertEqual(client.get(self.url).status_code, 200)
            self.assertEqual(self.add(client=client).status_code, 409)

    def test_draft_is_readonly_and_hidden_from_operator(self):
        self.job.status = "draft"
        self.job.save()
        self.assertEqual(self.add().json()["code"], "job_not_open")
        self.assertEqual(self.operator.get(self.url).status_code, 404)
        self.assertFalse(self.current()["permissions"]["record"])

    def test_void_keeps_original_audit_and_zero_denominator(self):
        state = self.record()
        pk = state["entries"]["results"][0]["id"]
        self.assertEqual(self.void(pk, reason=" ").status_code, 400)
        response = self.void(pk)
        self.assertEqual(response.status_code, 200)
        state = response.json()
        self.assertEqual(state["summary"]["issued"], "0.000")
        self.assertIsNone(state["summary"]["yield_rate"])
        self.assertEqual(state["material"]["id"], self.material.pk)
        entry = state["entries"]["results"][0]
        self.assertEqual(entry["quantity"], "1200.000")
        self.assertEqual(entry["void"]["reason"], "Measured incorrectly")
        self.assertEqual(self.void(pk).json()["code"], "already_voided")
        snapshot = Reconciliation.objects.first()
        self.assertEqual(snapshot.action, "void")
        self.assertEqual(snapshot.entry_id, pk)
        for model in (MaterialEntry, MaterialVoid, Reconciliation):
            with self.assertRaises(ValidationError):
                model.objects.all().delete()
            obj = model.objects.first()
            with self.assertRaises(ValidationError):
                obj.save()
        self.record(quantity="1100")  # Explicit replacement, not overwriting original.
        self.assertEqual(MaterialEntry.objects.count(), 2)

    def test_duplicate_request_and_stale_edits(self):
        payload = self.payload()
        first = self.manager.post(f"{self.url}/entries", payload, content_type="application/json")
        self.assertEqual(first.status_code, 201)
        repeated = self.manager.post(f"{self.url}/entries", payload, content_type="application/json")
        self.assertEqual(repeated.json()["code"], "stale_revision")
        payload["revision"] = 1
        repeated = self.manager.post(f"{self.url}/entries", payload, content_type="application/json")
        self.assertEqual(repeated.json()["code"], "duplicate_record")
        self.assertEqual(MaterialEntry.objects.count(), 1)
        self.assertEqual(self.add(job_revision=100).json()["code"], "stale_revision")

    def test_cross_job_void_and_spoof_fields(self):
        other = ProductionJob.objects.create(title="Another", status="open", created_by=self.users["manager"])
        state = self.record()
        pk = state["entries"]["results"][0]["id"]
        response = self.manager.post(
            f"/api/v1/jobs/{other.pk}/materials/entries/{pk}/void",
            {"revision": 0, "job_revision": 1, "reason": "Wrong job"}, content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
        for key in ("created_by", "role", "job_id", "variance", "yield_rate"):
            self.assertEqual(self.add(**{key: 1}).status_code, 400)
        self.assertFalse(MaterialVoid.objects.exists())

    def test_atomic_rollback_when_audit_fails(self):
        with patch("materials.services.Reconciliation.objects.create", side_effect=IntegrityError("test")):
            self.assertEqual(self.add().status_code, 409)
        self.assertEqual(MaterialEntry.objects.count(), 0)
        state = self.record()
        pk = state["entries"]["results"][0]["id"]
        with patch("materials.services.Reconciliation.objects.create", side_effect=IntegrityError("test")):
            self.assertEqual(self.void(pk).status_code, 409)
        self.assertFalse(MaterialVoid.objects.exists())
        self.assertEqual(self.current()["summary"]["issued"], "1200.000")

    def test_database_constraints(self):
        self.record()
        entry = MaterialEntry.objects.first()
        # Bypass the immutable ORM only to prove database checks in an isolated test.
        from django.db import connection
        for column, value in [("quantity", "-1"), ("unit", "g"), ("kind", "rework")]:
            with self.assertRaises(IntegrityError), transaction.atomic(), connection.cursor() as cursor:
                cursor.execute(f'UPDATE materials_materialentry SET "{column}" = %s WHERE id = %s', [value, entry.pk])

    def test_auth_restricted_csrf_disabled(self):
        self.assertEqual(Client().get(self.url).status_code, 401)
        self.manager.defaults.pop("HTTP_X_CSRFTOKEN")
        self.assertEqual(self.add().status_code, 403)
        self.users["manager"].must_change_password = True
        self.users["manager"].temporary_password_expires_at = timezone.now() + timezone.timedelta(hours=1)
        self.users["manager"].save()
        self.assertEqual(self.manager.get(self.url).status_code, 403)
        self.users["manager"].is_active = False
        self.users["manager"].save()
        self.assertEqual(self.manager.get(self.url).status_code, 401)

    def test_pagination_catalog_search_and_visibility(self):
        for index in range(21):
            self.record(quantity="1")
        page = self.current(url=f"{self.url}?page=2&page_size=20")
        self.assertEqual(page["entries"]["count"], 21)
        self.assertEqual(len(page["entries"]["results"]), 1)
        self.assertEqual(page["summary"]["issued"], "21.000")
        self.assertEqual(self.manager.get(f"{self.url}?page=3").status_code, 404)
        self.assertEqual(self.manager.get(f"{self.url}?page_size=101").status_code, 400)
        self.assertEqual(self.manager.get("/api/v1/materials?search=Uncoated").json()["count"], 1)
        self.assertEqual(self.operator.get("/api/v1/materials").json()["count"], 1)

    def test_concurrent_writers_one_wins(self):
        clients = [self.client_for("manager"), self.client_for("production_supervisor")]
        values = [self.payload(), self.payload()]
        def run(pair):
            close_old_connections()
            try:
                client, payload = pair
                return client.post(f"{self.url}/entries", payload, content_type="application/json").status_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(run, zip(clients, values, strict=True)))
        self.assertEqual(sorted(results), [201, 409])
        self.assertEqual(MaterialEntry.objects.count(), 1)
        self.assertEqual(Reconciliation.objects.count(), 1)
