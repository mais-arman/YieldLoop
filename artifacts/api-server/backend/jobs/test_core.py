import io
import os
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TransactionTestCase, override_settings
from inventory.models import InventoryEvent, OffcutLot
from materials import tests as material_fixtures
from materials.models import MaterialEntry, Reconciliation

from .demo import CASES, verify_case, verify_target
from .models import JobEvent, ProductionJob


class CoreTests(TransactionTestCase):
    setUp = material_fixtures.MaterialTests.setUp
    client_for = material_fixtures.MaterialTests.client_for
    current = material_fixtures.MaterialTests.current
    payload = material_fixtures.MaterialTests.payload
    add = material_fixtures.MaterialTests.add
    void = material_fixtures.MaterialTests.void

    def seed(self):
        call_command("seed_challenge_demo", actor_id=self.users["manager"].pk,
                     confirm_database="test_yieldloop_phase2b",
                     confirm_cluster=os.environ["YIELDLOOP_DEV_CLUSTER"], stdout=io.StringIO())
        return [ProductionJob.objects.get(reference=ref) for ref in CASES]

    def update(self, job, client=None, **values):
        job.refresh_from_db()
        return (client or self.manager).patch(f"/api/v1/jobs/{job.pk}",
            {"revision": job.revision, **values}, content_type="application/json")

    def test_exact_cases_seed_twice_and_read_persisted_inventory(self):
        jobs = self.seed()
        models = [ProductionJob, JobEvent, MaterialEntry, Reconciliation, OffcutLot, InventoryEvent]
        counts = [model.objects.count() for model in models]
        self.seed()
        self.assertEqual(counts, [model.objects.count() for model in models])
        self.assertEqual(OffcutLot.objects.count(), 2)
        self.assertEqual(InventoryEvent.objects.count(), 2)
        for job, expected in zip(jobs, [
            ("1200.000", "900.000", "240.000", "60.000", "20.000", "75.000"),
            ("1000.000", "820.000", "100.000", "80.000", "10.000", "82.000"),
        ], strict=True):
            data = verify_case(job, CASES[job.reference])
            self.assertEqual(tuple(data[k] for k in ("issued", "good", "scrap", "offcut", "scrap_rate", "yield_rate")), expected)
            self.assertEqual(data["variance"], "0.000")
        self.assertTrue(ProductionJob.objects.filter(pk=self.job.pk, title="Material test").exists())

    def test_comparison_sources_categories_and_permissions(self):
        a, b = self.seed()
        url = f"/api/v1/reports/comparison?left={a.pk}&right={b.pk}"
        for client in (self.manager, self.supervisor, self.operator):
            result = client.get(url)
            self.assertEqual(result.status_code, 200)
            data = result.json()
            self.assertTrue(data["same_machine"])
            self.assertEqual(data["differences"]["scrap_rate"], "10.000")
            self.assertEqual(data["differences"]["yield_rate"], "-7.000")
            self.assertEqual(data["left"]["scrap_by_reason"][0]["reason"], "Setup/layout")
            self.assertEqual(data["right"]["scrap_by_reason"][0]["reason"], None)
            self.assertEqual(len(data["left"]["entry_ids"]), 5)
        self.assertEqual(self.update(a, machine="Different").status_code, 200)
        self.assertIsNone(self.manager.get(url).json()["differences"])
        self.assertFalse(self.manager.get(url).json()["same_machine"])
        a.status = "draft"
        a.save()
        self.assertEqual(self.operator.get(url).status_code, 404)
        self.assertEqual(self.manager.get(f"/api/v1/reports/comparison?left={a.pk}&right={a.pk}").status_code, 400)

    def test_closing_all_roles_and_immutable_completed_jobs(self):
        a, b = self.seed()
        for job, client in ((a, self.manager), (b, self.supervisor)):
            response = self.update(job, client, status="completed")
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(JobEvent.objects.filter(job=job).first().new_status, "completed")
            self.assertEqual(self.update(job, notes="Cannot edit").status_code, 409)
        self.assertEqual(self.update(self.job, machine="CT-2").status_code, 200)
        self.job.refresh_from_db()
        self.assertEqual(self.add("issue", "10", client=self.operator).status_code, 201)
        self.assertEqual(self.add("good", "10", client=self.operator).status_code, 201)
        self.assertEqual(self.update(self.job, self.operator, status="completed").status_code, 200)
        self.assertEqual(self.operator.get(f"/api/v1/jobs/{self.job.pk}").status_code, 404)
        self.assertEqual(self.add("scrap", "1").status_code, 409)
        self.seed()  # completed demonstration cases are not reopened or duplicated

    def test_incomplete_unbalanced_and_precision_cannot_close(self):
        self.assertEqual(self.update(self.job, status="completed").json()["code"], "machine_required")
        self.update(self.job, machine="CT-2")
        self.assertEqual(self.update(self.job, status="completed").json()["code"], "material_incomplete")
        self.add("issue", "10.001")
        self.add("good", "10.000")
        result = self.update(self.job, self.operator, status="completed")
        self.assertEqual(result.json()["code"], "material_unbalanced")
        self.assertFalse(self.current()["closing"]["can_close"])
        self.add("scrap", "0.001", scrap_reason="Measured trim")
        self.assertTrue(self.current()["closing"]["can_close"])
        # A combined request may not clear machine and bypass the completion check.
        self.assertEqual(self.update(self.job, machine="", status="completed").json()["code"], "machine_required")
        self.assertEqual(self.update(self.job, self.operator, status="completed").status_code, 200)

    def test_operator_cannot_manage_fields_or_catalogues(self):
        for values in ({"machine": "X"}, {"reference": "X"}, {"title": "X"}, {"notes": "X"}, {"status": "cancelled"}):
            self.assertEqual(self.update(self.job, self.operator, **values).status_code, 403)
        self.assertEqual(self.operator.post("/api/v1/jobs", {"title": "No"}, content_type="application/json").status_code, 403)
        self.assertEqual(self.add("issue", "1", scrap_reason="Not scrap").status_code, 400)
        # A first issue must be possible with an existing but never-used catalogue material.
        self.assertIn(self.material.pk, [m["id"] for m in self.operator.get("/api/v1/materials").json()["results"]])
        self.seed()
        self.assertEqual(self.update(self.job, self.operator, machine="CT-2").status_code, 200)
        self.assertEqual(JobEvent.objects.filter(job=self.job).first().new_machine, "CT-2")

    def test_void_replacement_updates_comparison_without_double_counting(self):
        a, b = self.seed()
        self.job = a
        self.url = f"/api/v1/jobs/{a.pk}/materials"
        entry = MaterialEntry.objects.get(job=a, scrap_reason="Setup/layout")
        self.material = entry.material
        result = self.void(entry.pk, client=self.operator)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["summary"]["variance"], "180.000")
        self.assertEqual(self.add("scrap", "180", client=self.operator, scrap_reason="Setup/layout").status_code, 201)
        data = self.manager.get(f"/api/v1/reports/comparison?left={a.pk}&right={b.pk}").json()
        group = data["left"]["scrap_by_reason"][0]
        self.assertEqual(group["quantity"], "180.000")
        self.assertNotIn(entry.pk, group["entry_ids"])
        self.assertEqual(data["differences"]["scrap_rate"], "10.000")

    def test_different_materials_and_stale_closing_are_rejected(self):
        a, _ = self.seed()
        self.update(self.job, machine="CT-2")
        self.add("issue", "10")
        self.add("good", "10")
        data = self.manager.get(f"/api/v1/reports/comparison?left={a.pk}&right={self.job.pk}").json()
        self.assertTrue(data["same_machine"])
        self.assertFalse(data["comparable_material"])
        self.assertIsNone(data["differences"])
        old_revision = a.revision
        self.update(a, notes="Recorded update")
        result = self.operator.patch(f"/api/v1/jobs/{a.pk}", {"revision": old_revision, "status": "completed"}, content_type="application/json")
        self.assertEqual(result.status_code, 409)
        self.assertEqual(result.json()["code"], "stale_revision")

    def test_seeding_refuses_collisions_and_wrong_targets(self):
        self.job.reference = "IK-202"
        self.job.save()
        with self.assertRaises(CommandError):
            self.seed()
        self.assertEqual(MaterialEntry.objects.count(), 0)
        with self.assertRaises(CommandError):
            verify_target("production", os.environ["YIELDLOOP_DEV_CLUSTER"])
        with override_settings(ENVIRONMENT="production"), self.assertRaises(CommandError):
            verify_target("test_yieldloop_phase2b", os.environ["YIELDLOOP_DEV_CLUSTER"])

    def test_renamed_demo_is_detected_without_recreating_it(self):
        a, _ = self.seed()
        self.assertEqual(self.update(a, reference="Renamed demonstration").status_code, 200)
        counts = (ProductionJob.objects.count(), MaterialEntry.objects.count())
        with self.assertRaises(CommandError):
            self.seed()
        self.assertEqual(counts, (ProductionJob.objects.count(), MaterialEntry.objects.count()))

    def test_ai_actual_largest_category_is_an_investigation_not_cause(self):
        a, _ = self.seed()
        entry = MaterialEntry.objects.get(job=a, scrap_reason="Setup/layout")
        output = {"answer_codes": ["material_balance"], "leads": [{"code": "review_entry", "record_ids": [f"entry:{entry.pk}"]}]}
        for language in ("en", "ar"):
            with patch("assistance.provider.complete", return_value=output):
                response = self.manager.post(f"/api/v1/jobs/{a.pk}/assistance",
                    {"language": language, "question": "Investigate scrap", "include_notes": False}, content_type="application/json")
            self.assertEqual(response.status_code, 200, response.content)
            lead = response.json()["possible_leads"][0]
            self.assertIn("180.000", lead["text"])
            self.assertIn("IK-202", lead["text"])
            self.assertTrue(lead["evidence_needed"])
            self.assertIn("not proof" if language == "en" else "ليست إثباتًا", lead["text"])
