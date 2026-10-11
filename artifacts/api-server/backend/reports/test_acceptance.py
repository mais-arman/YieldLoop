"""Repeatable cross-module acceptance against the isolated PostgreSQL test DB."""
import copy
import secrets
import uuid

from accounts.models import User
from cutting.models import PlanRevision
from cutting.tests import scenario
from django.db import connection
from django.test import Client, TransactionTestCase
from inventory import tests as inventory_fixtures
from jobs.models import ProductionJob
from materials import tests as material_fixtures
from materials.models import Material, Reconciliation


class MVPAcceptanceTests(TransactionTestCase):
    current = material_fixtures.MaterialTests.current
    payload = material_fixtures.MaterialTests.payload
    add = material_fixtures.MaterialTests.add
    record = material_fixtures.MaterialTests.record
    void = material_fixtures.MaterialTests.void
    register = inventory_fixtures.InventoryTests.register
    correct = inventory_fixtures.InventoryTests.correct

    def setUp(self):
        self.assertEqual(connection.settings_dict["NAME"], "test_yieldloop_phase2b")
        self.password = secrets.token_urlsafe(30)
        self.users = {
            role: User.objects.create_user(username=f"acceptance_{role}", password=self.password, role=role)
            for role in User.Role.values
        }
        self.manager = self.login("manager")
        self.supervisor = self.login("production_supervisor")
        self.operator = self.login("cutting_operator")
        self.job = ProductionJob.objects.create(title="Acceptance source", created_by=self.users["manager"])
        self.material = Material.objects.create(name="Acceptance identity", specification="No geometry inferred",
                                                unit="kg", created_by=self.users["manager"])
        self.url = f"/api/v1/jobs/{self.job.pk}/materials"

    def login(self, role):
        c = Client(enforce_csrf_checks=True)
        token = c.get("/api/v1/auth/csrf").json()["csrfToken"]
        r = c.post("/api/v1/auth/login", {"username": self.users[role].username, "password": self.password},
                   content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(r.status_code, 200)
        c.defaults["HTTP_X_CSRFTOKEN"] = r.json()["csrfToken"]
        return c

    def post(self, client, url, data):
        return client.post(url, data, content_type="application/json")

    def overview(self, client=None, **filters):
        r = (client or self.manager).get("/api/v1/reports/overview", {"material_id": self.material.pk, **filters})
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def open_job(self):
        r = self.supervisor.patch(f"/api/v1/jobs/{self.job.pk}", {"revision": 1, "status": "open"},
                                  content_type="application/json")
        self.assertEqual(r.status_code, 200, r.content)

    def test_complete_supported_workflow_and_cross_module_corrections(self):
        for client in (self.supervisor, self.operator):
            self.assertEqual(self.post(client, "/api/v1/jobs", {"title": "Denied"}).status_code, 403)
        r = self.post(self.manager, "/api/v1/jobs", {"title": "Created through API"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["status"], "draft")
        self.assertEqual(self.operator.get(f"/api/v1/jobs/{self.job.pk}").status_code, 404)
        self.open_job()
        self.record(quantity="1200")
        self.record("good", "900", client=self.supervisor)
        bad = self.record("scrap", "250")["entries"]["results"][0]["id"]
        offcut = self.record("offcut", "60")["entries"]["results"][0]["id"]
        self.assertEqual(self.current()["summary"]["variance"], "-10.000")
        self.assertEqual(self.void(bad, client=self.supervisor).status_code, 200)
        self.assertEqual(self.current()["summary"]["variance"], "240.000")
        corrected = self.record("scrap", "240")
        self.assertEqual(corrected["summary"]["yield_rate"], "75.000")
        self.assertEqual(corrected["summary"]["scrap_rate"], "20.000")
        self.assertEqual(corrected["summary"]["variance"], "0.000")
        before = self.current()
        registered = self.register(offcut)
        self.assertEqual(registered.status_code, 201, registered.content)
        lot = registered.json()
        self.assertEqual(lot["source_entry_id"], offcut)
        self.assertEqual(lot["compatibility"], "unverified")
        self.assertEqual(self.current(), before)
        self.assertEqual(self.void(offcut).status_code, 409)  # registered source cannot be rewritten
        report = self.overview()
        self.assertEqual(report["production"]["accounted"], "1200.000")
        self.assertEqual(report["production"]["offcut_rate"], "5.000")
        self.assertEqual(report["inventory"]["available"]["remaining"], "60.000")
        snapshot_count = Reconciliation.objects.count()
        cut = f"/api/v1/jobs/{self.job.pk}/cutting"
        first = scenario(self.material.pk)
        second = copy.deepcopy(first)
        second["key"] = "B"
        second["input"]["board"]["width"] = "50"
        evaluated = []
        for s in (first, second):
            a = self.post(self.manager, cut + "/evaluate", {"scenario": s, "generate": True})
            b = self.post(self.supervisor, cut + "/evaluate", {"scenario": s, "generate": True})
            self.assertEqual(a.status_code, 200)
            self.assertEqual(a.json(), b.json())
            data = a.json()
            data.pop("result")
            evaluated.append(data)
        body = {"name": "Acceptance plan", "revision": 0, "reason": "Initial",
                "request_id": str(uuid.uuid4()), "scenarios": evaluated}
        saved = self.post(self.manager, cut, body)
        self.assertEqual(saved.status_code, 201, saved.content)
        plan = saved.json()
        self.assertEqual(self.operator.get(f"{cut}/{plan['id']}").json()["scenarios"], plan["scenarios"])
        self.assertEqual(self.post(self.manager, cut, body).status_code, 409)
        body.update(revision=1, request_id=str(uuid.uuid4()), name="Revised", reason="Comparison retained")
        revised = self.supervisor.put(f"{cut}/{plan['id']}", body, content_type="application/json")
        self.assertEqual(revised.status_code, 200)
        self.assertEqual(self.manager.put(f"{cut}/{plan['id']}", body, content_type="application/json").status_code, 409)
        self.assertEqual(PlanRevision.objects.count(), 2)
        self.assertEqual(Reconciliation.objects.count(), snapshot_count)
        after_planning = self.overview()
        for key in ("production", "inventory", "jobs", "lots", "job_count"):
            self.assertEqual(after_planning[key], report[key])
        self.assertEqual(self.current(), before)
        self.assertEqual(self.correct(lot["id"]).status_code, 200)
        self.assertEqual(self.current(), before)
        self.assertEqual(self.overview()["inventory"]["voided"]["count"], 1)
        self.assertEqual(self.void(offcut).status_code, 200)
        replacement = self.record("offcut", "50")["entries"]["results"][0]["id"]
        self.assertEqual(self.register(replacement).status_code, 201)
        final = self.overview()
        self.assertEqual(final["production"]["variance"], "10.000")
        self.assertEqual(final["production"]["offcut"], "50.000")
        self.assertEqual(final["inventory"]["available"]["remaining"], "50.000")
        self.assertEqual(final["inventory"]["voided"]["original_quantity"], "60.000")
        self.assertEqual(self.overview(page_size=1)["jobs"]["results"][0]["id"], self.job.pk)
        self.assertEqual(self.overview(status="draft")["job_count"], 0)
        self.assertEqual(self.overview(self.operator)["production"], final["production"])
        self.job.refresh_from_db()
        cancelled = self.manager.patch(f"/api/v1/jobs/{self.job.pk}",
                                       {"revision": self.job.revision, "status": "cancelled"},
                                       content_type="application/json")
        self.assertEqual(cancelled.status_code, 200)
        self.assertEqual(self.operator.get(cut).status_code, 404)
        self.assertEqual(self.post(self.manager, cut + "/evaluate", {"scenario": first, "generate": True}).status_code, 409)
        self.assertEqual(self.add().status_code, 409)
        self.assertEqual(self.manager.get(f"{cut}/{plan['id']}/history").json()["count"], 2)

    def test_cross_job_denial_session_revocation_logout_and_csrf(self):
        self.open_job()
        for client in (self.operator,):
            self.assertEqual(self.add(client=client).status_code, 201)
            self.assertEqual(self.register(source=999, client=client).status_code, 403)
        self.record(quantity="100")
        source = self.record("offcut", "10")["entries"]["results"][0]["id"]
        other = ProductionJob.objects.create(title="Other source", status="open", created_by=self.users["manager"])
        self.assertEqual(self.register(source, job_id=other.pk).status_code, 404)
        no_csrf = self.login("manager")
        no_csrf.defaults.pop("HTTP_X_CSRFTOKEN")
        self.assertEqual(self.post(no_csrf, "/api/v1/jobs", {"title": "Denied"}).status_code, 403)
        old = self.login("production_supervisor")
        user = self.users["production_supervisor"]
        response = self.manager.patch(f"/api/v1/employees/{user.pk}", {"is_active": False},
                                      content_type="application/json")
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(old.get(self.url).status_code, 401)
        self.assertEqual(self.post(self.operator, "/api/v1/auth/logout", {}).status_code, 200)
        self.assertEqual(self.operator.get(self.url).status_code, 401)
