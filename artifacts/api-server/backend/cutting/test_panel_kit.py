import copy
import uuid
from unittest.mock import patch

from assistance import provider
from assistance.tests import AssistanceTests, concept
from django.test import TransactionTestCase
from rest_framework.exceptions import ValidationError

from .models import PackagingRevision, PlanRevision
from .panel_kit import pieces
from .tests import scenario


class PanelKitTests(TransactionTestCase):
    setUp = AssistanceTests.setUp
    post = AssistanceTests.post

    def saved(self, template="flat_box"):
        response = self.post("/api/v1/packaging/designs", {
            "design": concept(template, length="350", width="350", height="40",
                              thickness="3", lid_height="35", clearance="1"),
            "reason": "Test panel kit", "request_id": str(uuid.uuid4()),
        })
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def source(self, row):
        return {"concept_id": row["id"], "revision": row["revision"], "method": "separate_panels_v1"}

    def test_exact_components_and_unsupported(self):
        design = self.saved()["design"]
        result = pieces(design)
        self.assertEqual(sum(p["quantity"] for p in result), 10)
        self.assertEqual([(p["width"], p["height"], p["quantity"]) for p in result], [
            ("356.000", "356.000", 1), ("350.000", "40.000", 2), ("356.000", "40.000", 2),
            ("364.000", "364.000", 1), ("358.000", "35.000", 2), ("364.000", "35.000", 2)])
        with self.assertRaises(ValidationError):
            pieces(concept("tray"))

    def test_save_reopen_revision_and_tampering(self):
        row = self.saved()
        source = self.source(row)
        kit = self.post("/api/v1/packaging/panel-kit", source)
        self.assertEqual(kit.status_code, 200, kit.content)
        s = scenario(self.material.pk)
        s["source"] = source
        s["input"]["pieces"] = kit.json()["pieces"]
        s["input"]["board"].update(width="1000.000", height="1000.000")
        path = f"/api/v1/jobs/{self.job.pk}/cutting"
        evaluation = self.post(path + "/evaluate", {"scenario": s, "generate": True})
        self.assertEqual(evaluation.status_code, 200, evaluation.content)
        s.update(placements=evaluation.json()["placements"], origin="shelf_v1")
        self.assertEqual(evaluation.json()["result"]["placed_count"], 10)
        body = {"name": "Panel kit", "revision": 0, "request_id": str(uuid.uuid4()), "reason": "Test", "scenarios": [s]}
        saved = self.post(path, body)
        self.assertEqual(saved.status_code, 201, saved.content)
        url = path + f'/{saved.json()["id"]}'
        self.assertEqual(self.manager.get(url).json()["scenarios"][0]["source"], source)
        self.assertEqual(PlanRevision.objects.get(plan_id=saved.json()["id"]).scenarios[0]["source"], source)
        body["request_id"] = str(uuid.uuid4())
        self.assertEqual(self.manager.put(url, body, content_type="application/json").status_code, 409)
        body["revision"] = 1
        del body["scenarios"][0]["source"]
        self.assertEqual(self.manager.put(url, body, content_type="application/json").status_code, 400)
        body["scenarios"][0]["source"] = source
        body["scenarios"][0]["input"]["pieces"][0]["width"] = "100.000"
        self.assertEqual(self.manager.put(url, body, content_type="application/json").status_code, 400)
        self.assertEqual(self.manager.get(url).json()["revision"], 1)

    def test_roles_and_historical_source(self):
        row = self.saved()
        source = self.source(row)
        self.assertEqual(self.post("/api/v1/packaging/panel-kit", source, self.clients["cutting_operator"]).status_code, 403)
        self.assertEqual(self.post("/api/v1/packaging/panel-kit", source, self.clients["production_supervisor"]).status_code, 200)
        changed = copy.deepcopy(row["design"])
        changed["parameters"]["length"] = "360"
        update = self.manager.put(f'/api/v1/packaging/designs/{row["id"]}', {
            "design": changed, "revision": 1, "request_id": str(uuid.uuid4()), "reason": "New geometry",
        }, content_type="application/json")
        self.assertEqual(update.status_code, 200, update.content)
        old = self.manager.get(f'/api/v1/packaging/designs/{row["id"]}?revision=1').json()
        self.assertEqual(old["design"], row["design"])
        self.assertEqual(PackagingRevision.objects.filter(package_id=row["id"]).count(), 2)
        self.assertEqual(self.post("/api/v1/packaging/panel-kit", source).json()["pieces"][0]["width"], "356.000")

    def test_ai_authorization_context_and_errors(self):
        operator = self.clients["cutting_operator"]
        with patch("assistance.provider.complete") as call:
            self.assertEqual(self.post(self.base, {"question": "Help", "language": "en"}, operator).status_code, 403)
            self.assertFalse(operator.get("/api/v1/assistance/status").json()["available"])
            call.assert_not_called()
        from jobs.models import ProductionJob
        peer = ProductionJob.objects.create(title="Peer", reference="TEST-PEER", status="open", created_by=self.users["manager"])
        with patch("assistance.provider.complete", return_value=self.output) as call:
            for lang in ("en", "ar"):
                result = self.post(self.base, {"question": "Compare TEST-PEER", "language": lang})
                self.assertEqual(result.status_code, 200, result.content)
                self.assertEqual(result.json()["related_evidence"][0]["job"]["id"], peer.pk)
                self.assertIn("no_reconciliation", result.json()["related_evidence"][0]["limitations"])
                self.assertEqual(call.call_args.args[1]["related_jobs"][0]["job"]["id"], peer.pk)
        with patch("assistance.provider.complete", side_effect=provider.ProviderError()):
            self.assertEqual(self.post(self.base, {"question": "Help", "language": "en"}).status_code, 502)

    def test_attention_uses_actual_variance_and_pending_rework(self):
        from assistance.context import collect_context
        from jobs.models import ProductionJob
        job = ProductionJob.objects.create(title="Unresolved", status="open", created_by=self.users["manager"])
        for revision, kind, quantity in ((0, "issue", "10"), (1, "rework", "3")):
            response = self.post(f"/api/v1/jobs/{job.pk}/materials/entries", {
                "revision": revision, "job_revision": 1, "material_id": self.material.pk,
                "kind": kind, "quantity": quantity, "unit": "kg", "note": "Isolated test",
                "scrap_reason": "", "request_id": str(uuid.uuid4()),
            })
            self.assertEqual(response.status_code, 201, response.content)
        context = collect_context(self.users["manager"], self.job.pk, "What needs investigation?")
        row = next(r for r in context["attention_jobs"] if r["job_id"] == job.pk)
        self.assertEqual((row["variance"], row["pending_rework"]), ("7.000", "3.000"))
        self.assertEqual(row["href"], f"/jobs/{job.pk}")
