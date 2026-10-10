import uuid
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from accounts.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, close_old_connections
from django.test import Client, TransactionTestCase
from jobs.models import ProductionJob
from materials.models import MaterialEntry, Reconciliation
from materials.tests import MaterialTests

from .models import InventoryEvent, OffcutLot


class InventoryTests(TransactionTestCase):
    # Reuse fixture helpers only, not the inherited material test cases.
    setUp = MaterialTests.setUp
    client_for = MaterialTests.client_for
    current = MaterialTests.current
    payload = MaterialTests.payload
    add = MaterialTests.add
    record = MaterialTests.record
    void = MaterialTests.void

    def offcut(self, quantity="0.123"):
        if not MaterialEntry.objects.filter(job=self.job).exists():
            self.record(quantity="10")
        return self.record("offcut", quantity)["entries"]["results"][0]["id"]

    def register(self, source=None, client=None, **changes):
        body = {"job_id": self.job.pk, "source_entry_id": source or self.offcut(),
                "reason": "Registered after checking source", "request_id": str(uuid.uuid4()), **changes}
        return (client or self.manager).post("/api/v1/inventory", body, content_type="application/json")

    def correct(self, lot, client=None, **changes):
        return (client or self.manager).post(
            f"/api/v1/inventory/{lot}/void",
            {"revision": 1, "reason": "Inventory registration error", "request_id": str(uuid.uuid4()), **changes},
            content_type="application/json",
        )

    def test_registration_trace_exact_weight_no_accounting_effect(self):
        source = self.offcut()
        before = self.current()
        result = self.register(source)
        self.assertEqual(result.status_code, 201, result.content)
        lot = result.json()
        self.assertEqual(lot["quantity"], "0.123")
        self.assertEqual(lot["remaining"], "0.123")
        self.assertEqual(lot["compatibility"], "unverified")
        self.assertFalse(lot["permissions"]["consume"])
        snapshot = Reconciliation.objects.get(pk=lot["reconciliation_id"])
        self.assertEqual(snapshot.entry_id, source)
        self.assertEqual(self.current(), before)
        detail = self.manager.get(f"/api/v1/inventory/{lot['id']}").json()
        self.assertEqual(detail["history"][0]["actor"], "manager")
        self.assertEqual(detail["history"][0]["action"], "addition")
        self.assertEqual(self.client_for("manager").get(f"/api/v1/inventory/{lot['id']}").json(), detail)

    def test_duplicate_source_and_request_ids(self):
        source = self.offcut()
        req = str(uuid.uuid4())
        self.assertEqual(self.register(source, request_id=req).status_code, 201)
        self.assertEqual(self.register(source, request_id=req).status_code, 409)
        self.assertEqual(self.register(source).status_code, 409)
        other = self.offcut()
        self.assertEqual(self.register(other, request_id=req).status_code, 409)
        self.assertEqual(OffcutLot.objects.count(), 1)
        self.assertEqual(InventoryEvent.objects.count(), 1)

    def test_void_and_original_correction(self):
        source = self.offcut()
        before = self.current()
        lot = self.register(source).json()["id"]
        self.assertEqual(self.void(source).json()["code"], "inventory_active")
        self.assertEqual(self.correct(lot, reason=" ").status_code, 400)
        self.assertEqual(self.correct(lot, revision=7).json()["code"], "stale_revision")
        result = self.correct(lot)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["remaining"], "0.000")
        self.assertEqual(result.json()["quantity"], "0.123")
        self.assertEqual(result.json()["state"], "voided")
        self.assertEqual(self.current(), before)
        self.assertEqual(self.correct(lot).status_code, 409)
        self.assertEqual(self.register(source).status_code, 409)
        self.assertEqual(self.void(source).status_code, 200)
        self.assertTrue(self.manager.get(f"/api/v1/inventory/{lot}").json()["source_voided"])
        for model in (OffcutLot, InventoryEvent):
            with self.assertRaises(ValidationError):
                model.objects.all().delete()
            with self.assertRaises(ValidationError):
                model.objects.first().save()

    def test_invalid_sources_cross_job_and_client_owned_fields(self):
        source = self.offcut()
        other = ProductionJob.objects.create(title="Other", status="open", created_by=self.users["manager"])
        self.assertEqual(self.register(source, job_id=other.pk).status_code, 404)
        issue = MaterialEntry.objects.get(kind="issue")
        self.assertEqual(self.register(issue.pk).status_code, 409)
        for field in ("quantity", "material_id", "unit", "created_by", "state", "target_job_id"):
            self.assertEqual(self.register(source, **{field: "1"}).status_code, 400)
        self.assertEqual(self.void(source).status_code, 200)
        self.assertEqual(self.register(source).status_code, 409)

    def test_roles_and_cancelled_source(self):
        source = self.offcut()
        self.assertEqual(self.register(source, client=self.operator).status_code, 403)
        lot = self.register(source, client=self.supervisor).json()["id"]
        self.assertEqual(self.operator.get(f"/api/v1/inventory/{lot}").status_code, 200)
        self.assertEqual(self.correct(lot, client=self.operator).status_code, 403)
        self.assertEqual(self.correct(lot, client=self.supervisor).status_code, 200)
        self.job.status = "cancelled"
        self.job.save()
        self.assertEqual(self.operator.get(f"/api/v1/inventory/{lot}").status_code, 404)
        self.assertEqual(self.operator.get("/api/v1/inventory").json()["count"], 0)
        self.assertEqual(self.correct(lot).json()["code"], "job_not_open")
        self.assertEqual(self.register(source).json()["code"], "job_not_open")
        self.job.status = "draft"
        self.job.save()
        self.assertEqual(self.register(source).status_code, 409)

    def test_reuse_and_partial_quantities_always_blocked(self):
        lot = self.register().json()["id"]
        before = self.current()
        for action in ("reserve", "consume", "release"):
            for qty in ("0.001", "0.123", "0.124", "-1", "0.0001"):
                for client in (self.manager, self.supervisor, self.operator):
                    response = client.post(f"/api/v1/inventory/{lot}/{action}",
                                           {"quantity": qty, "target_job_id": self.job.pk},
                                           content_type="application/json")
                    self.assertEqual(response.status_code, 403 if client == self.operator else 409)
        self.assertEqual(self.current(), before)
        self.assertEqual(InventoryEvent.objects.count(), 1)
        self.assertEqual(self.manager.get(f"/api/v1/inventory/{lot}").json()["remaining"], "0.123")

    def test_rollback_registration_and_void(self):
        source = self.offcut()
        with patch("inventory.services.InventoryEvent.objects.create", side_effect=IntegrityError("test")):
            self.assertEqual(self.register(source).status_code, 409)
        self.assertFalse(OffcutLot.objects.exists())
        lot = self.register(source).json()["id"]
        with patch("inventory.services.InventoryEvent.objects.create", side_effect=IntegrityError("test")):
            self.assertEqual(self.correct(lot).status_code, 409)
        self.assertEqual(self.manager.get(f"/api/v1/inventory/{lot}").json()["state"], "available")

    def test_concurrent_registration_void_and_blocked_consumption(self):
        source = self.offcut()
        clients = [self.client_for("manager"), self.client_for("production_supervisor")]
        def run_register(client):
            close_old_connections()
            try:
                return self.register(source, client=client).status_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(run_register, clients))
        self.assertEqual(sorted(results), [201, 409])
        lot = OffcutLot.objects.get().pk
        def run_void(client):
            close_old_connections()
            try:
                return self.correct(lot, client=client).status_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(run_void, clients))
        self.assertEqual(sorted(results), [200, 409])
        self.assertEqual(InventoryEvent.objects.count(), 2)

    def test_pagination_filters_auth_and_csrf(self):
        for _ in range(3):
            self.assertEqual(self.register().status_code, 201)
        page = self.manager.get("/api/v1/inventory?page=2&page_size=2&search=Test").json()
        self.assertEqual(page["count"], 3)
        self.assertEqual(len(page["results"]), 1)
        self.assertEqual(self.manager.get("/api/v1/inventory?state=voided").json()["count"], 0)
        self.assertEqual(self.manager.get("/api/v1/inventory?page=99").status_code, 404)
        self.assertEqual(self.manager.get("/api/v1/inventory?state=consumed").status_code, 400)
        self.assertEqual(Client().get("/api/v1/inventory").status_code, 401)
        source = self.offcut()
        self.manager.defaults.pop("HTTP_X_CSRFTOKEN")
        self.assertEqual(self.register(source).status_code, 403)
        User.objects.filter(pk=self.users["manager"].pk).update(is_active=False)
        self.assertEqual(self.manager.get("/api/v1/inventory").status_code, 401)
