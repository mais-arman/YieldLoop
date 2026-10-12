from django.db import IntegrityError, transaction
from django.test import TransactionTestCase
from materials import tests as fixtures
from materials.models import MaterialEntry
from .models import ProductionJob, JobEvent
from .test_core import CoreTests


class PlanningCardTests(TransactionTestCase):
    setUp = fixtures.MaterialTests.setUp
    client_for = fixtures.MaterialTests.client_for
    current = fixtures.MaterialTests.current
    payload = fixtures.MaterialTests.payload
    add = fixtures.MaterialTests.add
    void = fixtures.MaterialTests.void
    seed = CoreTests.seed
    update = CoreTests.update

    def test_create_persist_update_clear_and_audit(self):
        fields = dict(product_specification="Verified sample specification", sheet_width="300.125",
                      sheet_height="200", sheet_unit="mm", planned_yield="82.500", cutting_instructions="Follow approved sheet.")
        result = self.manager.post("/api/v1/jobs", {"title": "Planning fixture", **fields}, content_type="application/json")
        self.assertEqual(result.status_code, 201, result.content)
        job = ProductionJob.objects.get(pk=result.json()["id"])
        self.assertEqual(self.manager.get(f"/api/v1/jobs/{job.pk}").json()["sheet_height"], "200.000")
        self.assertEqual(JobEvent.objects.filter(job=job).first().new_card["planned_yield"], "82.500")
        old_revision = job.revision
        updated = self.update(job, sheet_width="250.000", planned_yield="0", product_specification="")
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(updated.json()["planned_yield"], "0.000")
        event = JobEvent.objects.filter(job=job).first()
        self.assertEqual(event.old_card["sheet_width"], "300.125")
        self.assertEqual(event.new_card["sheet_width"], "250.000")
        stale = self.manager.patch(f"/api/v1/jobs/{job.pk}", {"revision": old_revision, "cutting_instructions": "Stale"}, content_type="application/json")
        self.assertEqual(stale.status_code, 409)
        cleared = self.update(job, sheet_width=None, sheet_height=None, sheet_unit="", planned_yield=None, cutting_instructions="")
        self.assertEqual(cleared.status_code, 200)
        self.assertIsNone(cleared.json()["sheet_width"])
        self.assertEqual(self.update(job, product_specification="").json()["revision"], cleared.json()["revision"])

    def test_missing_metadata_and_role_enforcement(self):
        for client in (self.manager, self.supervisor, self.operator):
            data = client.get(f"/api/v1/jobs/{self.job.pk}").json()
            self.assertEqual(data["product_specification"], "")
            self.assertIsNone(data["planned_yield"])
            self.assertIsNone(data["sheet_width"])
        for client in (self.operator, self.supervisor):
            self.assertEqual(self.update(self.job, client, product_specification="Unauthorized").status_code, 403)
        self.assertEqual(self.update(self.job, cutting_instructions="Approved").status_code, 200)
        self.assertEqual(self.operator.get(f"/api/v1/jobs/{self.job.pk}").json()["cutting_instructions"], "Approved")

    def test_invalid_card_fields_rejected_without_writes(self):
        cases = [
            {"sheet_width": "1"}, {"sheet_unit": "mm"},
            {"sheet_width": "1", "sheet_height": "2", "sheet_unit": "kg"},
            {"sheet_width": "0", "sheet_height": "2", "sheet_unit": "mm"},
            {"sheet_width": "-1", "sheet_height": "2", "sheet_unit": "mm"},
            {"sheet_width": 1, "sheet_height": "2", "sheet_unit": "mm"},
            {"planned_yield": "100.001"}, {"planned_yield": "-1"}, {"planned_yield": "NaN"},
            {"planned_yield": "1.2345"}, {"planned_yield": 50},
            {"product_specification": "x" * 5001}, {"cutting_instructions": "x" * 5001},
        ]
        before = (ProductionJob.objects.count(), JobEvent.objects.count())
        for fields in cases:
            with self.subTest(fields=list(fields)):
                response = self.manager.post("/api/v1/jobs", {"title": "Invalid fixture", **fields}, content_type="application/json")
                self.assertEqual(response.status_code, 400, response.content)
                self.assertEqual(self.update(self.job, **fields).status_code, 400)
        self.assertEqual(before, (ProductionJob.objects.count(), JobEvent.objects.count()))

    def test_database_constraints_and_partial_clear(self):
        for fields in ({"planned_yield": 101}, {"sheet_width": 1}, {"sheet_unit": "kg"}):
            with self.assertRaises(IntegrityError), transaction.atomic():
                ProductionJob.objects.filter(pk=self.job.pk).update(**fields)
        self.assertEqual(self.update(self.job, sheet_width="2", sheet_height="3", sheet_unit="cm").status_code, 200)
        self.assertEqual(self.update(self.job, sheet_height=None).status_code, 400)
        self.assertEqual(self.update(self.job, sheet_width="4").status_code, 200)

    def test_reference_rates_differences_and_entry_navigation(self):
        a, b = self.seed()
        data = self.manager.get(f"/api/v1/reports/comparison?left={a.pk}&right={b.pk}").json()
        self.assertEqual(data["left"]["summary"]["offcut_rate"], "5.000")
        self.assertEqual(data["right"]["summary"]["offcut_rate"], "8.000")
        self.assertEqual({k: data["differences"][k] for k in ("scrap_rate", "offcut_rate", "scrap", "yield_rate")},
                         {"scrap_rate": "10.000", "offcut_rate": "-3.000", "scrap": "140.000", "yield_rate": "-7.000"})
        self.assertEqual(data["left"]["scrap_by_reason"][0]["quantity"], "180.000")
        self.assertIsNone(data["right"]["scrap_by_reason"][0]["reason"])
        for source in (data["left"], data["right"]):
            self.assertIsNone(source["job"]["sheet_width"])
            self.assertIsNone(source["job"]["planned_yield"])
        target = MaterialEntry.objects.filter(job=a).order_by("pk").first()
        url = f"/api/v1/jobs/{a.pk}/materials?entry_id={target.pk}&page_size=2"
        for client in (self.manager, self.supervisor, self.operator):
            response = client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["entries"]["page"], 3)
            self.assertIn(target.pk, [r["id"] for r in response.json()["entries"]["results"]])
        self.assertEqual(self.manager.get(f"/api/v1/jobs/{b.pk}/materials?entry_id={target.pk}").status_code, 404)
        self.update(a, status="completed")
        self.assertEqual(self.operator.get(url).status_code, 404)
        self.assertEqual(self.update(a, planned_yield="50").status_code, 409)

    def test_under_over_zero_and_null_offcut_rate(self):
        self.update(self.job, machine="CT-2")
        self.assertIsNone(self.current()["summary"])
        self.add("issue", "10")
        self.add("good", "9")
        self.assertEqual(self.current()["summary"]["offcut_rate"], "0.000")
        self.assertEqual(self.update(self.job, status="completed").json()["code"], "material_unbalanced")
        self.add("scrap", "2")
        self.assertEqual(self.current()["summary"]["variance"], "-1.000")
        self.assertEqual(self.update(self.job, self.operator, status="completed").json()["code"], "material_unbalanced")
        for entry in list(MaterialEntry.objects.filter(job=self.job).order_by("-pk")):
            self.assertEqual(self.void(entry.pk).status_code, 200)
        self.assertIsNone(self.current()["summary"]["offcut_rate"])
