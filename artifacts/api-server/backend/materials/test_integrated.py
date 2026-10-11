"""Direct-API integration of the approved pilot accounting and stock policy."""
import uuid
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal

from django.db import close_old_connections
from django.test import TransactionTestCase
from inventory import tests as inventory_tests
from inventory.models import StockMovement
from jobs.models import ProductionJob

from materials import tests as material_tests
from materials.models import MaterialEntry, Reconciliation


class IntegratedTests(TransactionTestCase):
    setUp = material_tests.MaterialTests.setUp
    client_for = material_tests.MaterialTests.client_for
    current = material_tests.MaterialTests.current
    payload = material_tests.MaterialTests.payload
    add = material_tests.MaterialTests.add
    record = material_tests.MaterialTests.record
    void = material_tests.MaterialTests.void
    offcut = inventory_tests.InventoryTests.offcut
    register = inventory_tests.InventoryTests.register

    def test_reporting_denied_for_operator_even_known_and_hidden_ids(self):
        other = ProductionJob.objects.create(title="Closed", created_by=self.users["manager"], status="completed", machine="CT-2")
        for url in ["/api/v1/reports/overview", f"/api/v1/reports/comparison?left={self.job.pk}&right={other.pk}"]:
            self.assertEqual(self.operator.get(url).status_code, 403)
        for status in ("completed", "cancelled", "draft"):
            other.status = status
            other.save()
            self.assertEqual(self.operator.get(f"/api/v1/jobs/{other.pk}").status_code, 404)
        for client in (self.supervisor, self.manager):
            self.assertEqual(client.get("/api/v1/reports/overview").status_code, 200)
        for client in (self.operator, self.supervisor):
            self.assertEqual(client.get("/api/v1/employees").status_code, 403)
            self.assertEqual(client.post("/api/v1/materials", {"name":"forbidden","specification":"x","unit":"kg"}, content_type="application/json").status_code, 403)

    def rework(self):
        self.job.machine = "CT-2"
        self.job.save()
        self.record(quantity="100")
        self.record("good", "70")
        result = self.record("rework", "30", client=self.operator)
        self.assertEqual(result["summary"]["variance"], "0.000")
        self.assertEqual(result["summary"]["pending_rework"], "30.000")
        self.assertEqual(result["closing"]["reason"], "rework_pending")
        denied = self.operator.patch(f"/api/v1/jobs/{self.job.pk}",
            {"revision": self.job.revision, "status": "completed"}, content_type="application/json")
        self.assertEqual(denied.status_code, 400)
        self.assertEqual(denied.json()["code"], "rework_pending")
        return result["entries"]["results"][0]["id"]

    def test_partial_rework_success_failure_and_correction(self):
        source = self.rework()
        result = self.add("good", "10", resolve_rework_id=source, client=self.operator)
        self.assertEqual(result.status_code, 201, result.content)
        output = result.json()["entries"]["results"][0]["id"]
        self.assertEqual(result.json()["summary"]["pending_rework"], "20.000")
        self.assertEqual(result.json()["summary"]["good"], "80.000")
        self.assertEqual(self.void(source).status_code, 409)
        self.assertEqual(self.void(output).status_code, 200)
        self.assertEqual(self.current()["summary"]["pending_rework"], "30.000")
        result = self.add("scrap", "30", resolve_rework_id=source, scrap_reason="Failed rework")
        self.assertEqual(result.status_code, 201, result.content)
        self.assertEqual(result.json()["summary"]["pending_rework"], "0.000")
        self.assertEqual(result.json()["summary"]["variance"], "0.000")
        self.assertTrue(result.json()["closing"]["can_close"])

    def test_rework_resolution_guards(self):
        source = self.rework()
        for kind, qty, extra in [
            ("good", "31", {}), ("scrap", "1", {}), ("issue", "1", {}),
            ("good", "-1", {}), ("good", "0.0001", {}), ("good", 1, {}),
            ("good", "1", {"resolve_rework_id": source + 99999}),
        ]:
            response = self.add(kind, qty, **{"resolve_rework_id": source, **extra})
            self.assertIn(response.status_code, (400, 404, 409))
        self.assertEqual(self.current()["summary"]["pending_rework"], "30.000")
        self.job.status = "completed"
        self.job.save()
        self.assertEqual(self.add("good", "1", resolve_rework_id=source).status_code, 409)

    def stock(self):
        source = self.offcut("8")
        result = self.register(source, client=self.operator)
        self.assertEqual(result.status_code, 201, result.content)
        destination = ProductionJob.objects.create(title="Receiving", created_by=self.users["manager"], status="open", machine="CT-2")
        return result.json()["id"], destination

    def move(self, lot, job, action, quantity, client=None, revision=None):
        revision = revision or self.manager.get(f"/api/v1/inventory/{lot}").json()["revision"]
        return (client or self.manager).post(f"/api/v1/inventory/{lot}/{action}",
            {"job_id": job.pk, "quantity": quantity, "reason": "Isolated movement", "revision": revision,
             "request_id": str(uuid.uuid4())}, content_type="application/json")

    def test_partial_inventory_receiving_accounting_and_history(self):
        lot, destination = self.stock()
        self.assertEqual(self.move(lot, destination, "reserve", "6").status_code, 200)
        result = self.move(lot, destination, "consume", "2")
        self.assertEqual(result.status_code, 200, result.content)
        self.assertEqual(result.json()["remaining"], "6.000")
        self.assertEqual(result.json()["reserved"], "4.000")
        self.assertEqual(result.json()["available_to_reserve"], "2.000")
        result = self.move(lot, destination, "release", "1")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["available_to_reserve"], "3.000")
        snap = Reconciliation.objects.get(job=destination)
        self.assertEqual(snap.issued, Decimal(2))
        self.assertEqual(snap.variance, Decimal(2))
        self.assertEqual(StockMovement.objects.filter(lot_id=lot).count(), 3)
        history = self.manager.get(f"/api/v1/inventory/{lot}/movements").json()
        self.assertEqual(history["count"], 3)
        self.assertEqual(history["results"][1]["issue_entry_id"], snap.entry_id)
        response = self.manager.post(f"/api/v1/jobs/{destination.pk}/materials/entries/{snap.entry_id}/void",
            {"revision": 1, "job_revision": destination.revision, "reason": "Not allowed"}, content_type="application/json")
        self.assertEqual(response.status_code, 409)

    def test_inventory_permissions_and_invalid_operations(self):
        lot, destination = self.stock()
        for action in ("reserve", "release", "consume"):
            self.assertEqual(self.move(lot, destination, action, "1", client=self.operator).status_code, 403)
        for action, quantity in [("reserve","9"), ("release","1"), ("consume","1"), ("reserve","-1"), ("reserve","0.0001")]:
            self.assertIn(self.move(lot, destination, action, quantity).status_code, (400,409))
        self.assertEqual(self.move(lot, self.job, "reserve", "1").status_code, 409)
        self.assertEqual(self.move(lot, destination, "reserve", "1", client=self.supervisor).status_code, 200)
        self.assertEqual(self.move(lot, destination, "reserve", "1", revision=1).status_code, 409)
        response = self.manager.post(f"/api/v1/inventory/{lot}/void",
            {"revision":2,"request_id":str(uuid.uuid4()),"reason":"Cannot erase movements"}, content_type="application/json")
        self.assertEqual(response.status_code, 409)
        destination.status = "cancelled"
        destination.save()
        self.assertEqual(self.move(lot, destination, "consume", "1").status_code, 409)
        self.assertEqual(self.move(lot, destination, "release", "1").status_code, 200)

    def test_concurrent_reservations_cannot_overspend(self):
        lot, destination = self.stock()
        # Sessions pre-created to avoid conflating login concurrency with stock.
        clients = [self.client_for("manager"), self.client_for("production_supervisor")]
        def run(client):
            close_old_connections()
            try:
                return self.move(lot, destination, "reserve", "6", client=client, revision=1).status_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(run, clients))
        self.assertEqual(sorted(results), [200, 409])
        self.assertEqual(self.manager.get(f"/api/v1/inventory/{lot}").json()["reserved"], "6.000")

    def test_packaging_save_reopen_revision_and_validation(self):
        design = {"name":"Isolated concept","template":"flat_box","state":"assembled",
                  "parameters":{"length":"200","width":"100","height":"30","thickness":"1","lid_height":"10","clearance":"1"}}
        response = self.operator.post("/api/v1/packaging/designs",
            {"design":design,"reason":"Initial concept","request_id":str(uuid.uuid4())}, content_type="application/json")
        self.assertEqual(response.status_code, 201, response.content)
        pk = response.json()["id"]
        self.assertEqual(self.manager.get(f"/api/v1/packaging/designs/{pk}").json()["design"], design)
        body = {"design":design,"reason":"Reviewed dimensions","request_id":str(uuid.uuid4()),"revision":1}
        self.assertEqual(self.supervisor.put(f"/api/v1/packaging/designs/{pk}", body, content_type="application/json").status_code, 200)
        body["request_id"] = str(uuid.uuid4())
        self.assertEqual(self.manager.put(f"/api/v1/packaging/designs/{pk}", body, content_type="application/json").status_code, 409)
        self.assertEqual(self.manager.get(f"/api/v1/packaging/designs/{pk}/history").json()["count"], 2)
        design["parameters"]["height"] = "99999"
        body["revision"] = 2
        self.assertEqual(self.manager.put(f"/api/v1/packaging/designs/{pk}", body, content_type="application/json").status_code, 400)

    def test_new_endpoints_require_session_and_csrf(self):
        from django.test import Client
        anonymous = Client(enforce_csrf_checks=True)
        for url in ("/api/v1/packaging/designs", "/api/v1/packaging/designs/1",
                    "/api/v1/packaging/designs/1/history", "/api/v1/inventory/1/movements"):
            self.assertEqual(anonymous.get(url).status_code, 401)
        lot, _destination = self.stock()
        self.assertEqual(self.manager.post(f"/api/v1/inventory/{lot}/reserve", {},
            content_type="application/json", HTTP_X_CSRFTOKEN="incorrect").status_code, 403)

    def test_stock_material_mismatch_and_closed_receiving_job(self):
        from materials.models import Material
        lot, destination = self.stock()
        material = Material.objects.create(name="Other", specification="Different", created_by=self.users["manager"])
        entry = MaterialEntry.objects.create(job=destination, material=material, kind="issue",
            quantity="1", unit="kg", created_by=self.users["manager"])
        Reconciliation.objects.create(job=destination, material=material, entry=entry,
            actor=self.users["manager"], revision=1, action="record",
            issued="1", good="0", scrap="0", offcut="0", accounted="0", variance="1")
        self.assertEqual(self.move(lot, destination, "reserve", "1").status_code, 409)
        destination.status = "completed"
        destination.save()
        self.assertEqual(self.move(lot, destination, "reserve", "1").status_code, 409)
