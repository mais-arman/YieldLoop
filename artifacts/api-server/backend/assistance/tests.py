import json
import uuid
from decimal import Decimal
from unittest.mock import patch
from urllib.error import URLError

from accounts.models import User
from audit.models import AuditEvent
from django.core.cache import cache
from django.test import Client, SimpleTestCase, TransactionTestCase
from django.utils import timezone
from jobs.models import ProductionJob
from materials.models import Material, MaterialEntry, Reconciliation
from rest_framework.exceptions import ValidationError

from . import packaging, provider


def concept(template="tray", **parameters):
    params = {"length": "300", "width": "200", "height": "80", "thickness": "2"}
    if template == "lid_box":
        params.update(lid_height="20", clearance="0.5")
    return {"template": template, "name": "Concept", "parameters": {**params, **parameters}, "state": "assembled"}


class PackagingValidationTests(SimpleTestCase):
    def test_catalogue_and_all_templates(self):
        self.assertEqual(len(packaging.catalogue()["templates"]), 3)
        for name in packaging.TYPES:
            self.assertEqual(packaging.validate(concept(name))["template"], name)

    def test_states_and_exact_decimal_parameters(self):
        for template in ("tray", "lid_box"):
            design = {**concept(template, length="300.123"), "state": "open"}
            self.assertEqual(packaging.validate(design), design)
        with self.assertRaises(ValidationError):
            packaging.validate({**concept("sleeve"), "state": "open"})

    def test_invalid_numeric_combinations(self):
        for value in ("0", "-1", "NaN", "Infinity", "1e2", "5000.001", "1.0001", "", 300, True, None, []):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                packaging.validate(concept(length=value))
        for params in ({"thickness": "20", "height": "79.999"}, {"clearance": "0"}, {"lid_height": "81"}):
            with self.subTest(params=params), self.assertRaises(ValidationError):
                packaging.validate(concept("lid_box", **params))

    def test_unknown_and_missing_fields(self):
        for invalid in ({**concept(), "production_validated": True}, concept("arbitrary"),
                        concept(lid_height="4"), {**concept(), "parameters": {}},
                        {**concept(), "name": ""}, {**concept(), "template": []}):
            with self.assertRaises(ValidationError):
                packaging.validate(invalid)

    def test_exact_thickness_boundary(self):
        self.assertEqual(packaging.validate(concept(height="8"))["parameters"]["height"], "8")
        with self.assertRaises(ValidationError):
            packaging.validate(concept(height="7.999"))


class ProviderTests(SimpleTestCase):
    @patch.dict("os.environ", {}, clear=True)
    def test_unavailable_never_calls_provider(self):
        self.assertFalse(provider.status()["available"])
        with patch("assistance.provider.urlopen") as call, self.assertRaises(provider.Unavailable):
            provider.complete("JSON", {})
        call.assert_not_called()

    @patch.dict("os.environ", {"YIELDLOOP_AI_API_KEY": "unit-test-not-a-credential"}, clear=True)
    def test_provider_errors_are_redacted(self):
        with patch("assistance.provider.urlopen", side_effect=URLError("sensitive details")):
            with self.assertRaises(provider.ProviderError) as error:
                provider.complete("JSON", {})
            self.assertNotIn("sensitive", str(error.exception))

    @patch.dict("os.environ", {"YIELDLOOP_AI_API_KEY": "unit-test-not-a-credential"}, clear=True)
    def test_malformed_truncated_oversize_and_success(self):
        for raw in (b"oops", b"{}", b"x" * 131073,
                    json.dumps({"choices": [{"finish_reason": "length", "message": {"content": "{}"}}]}).encode()):
            with patch("assistance.provider.urlopen") as call:
                call.return_value.__enter__.return_value.read.return_value = raw
                with self.assertRaises(provider.InvalidOutput):
                    provider.complete("JSON", {})
        with patch("assistance.provider.urlopen") as call:
            call.return_value.__enter__.return_value.read.return_value = json.dumps({
                "choices": [{"finish_reason": "stop", "message": {"content": '{"ok":true}'}}]}).encode()
            self.assertEqual(provider.complete("JSON", {}), {"ok": True})


class AssistanceTests(TransactionTestCase):
    def setUp(self):
        cache.clear()
        self.users = {role: User.objects.create_user(username=role, password="isolated-test-password",
                                                   role=role) for role in User.Role.values}
        self.clients = {}
        for role, user in self.users.items():
            client = Client(enforce_csrf_checks=True)
            client.force_login(user)
            session = client.session
            session["absolute_expiry"] = (timezone.now() + timezone.timedelta(hours=1)).timestamp()
            session.save()
            client.defaults["HTTP_X_CSRFTOKEN"] = client.get("/api/v1/auth/csrf").json()["csrfToken"]
            self.clients[role] = client
        self.manager = self.clients["manager"]
        self.job = ProductionJob.objects.create(title="Evidence", status="open", created_by=self.users["manager"])
        self.material = Material.objects.create(name="Paper", specification="Test", created_by=self.users["manager"])
        self.base = f"/api/v1/jobs/{self.job.pk}/assistance"
        for kind, amount, note in (("issue", "1200", ""), ("good", "900", ""),
                                   ("scrap", "180", "setup/layout"), ("scrap", "60", "damage"),
                                   ("offcut", "60", "")):
            result = self.post(f"/api/v1/jobs/{self.job.pk}/materials/entries", {
                "revision": Reconciliation.objects.filter(job=self.job).count(), "job_revision": 1,
                "material_id": self.material.pk, "kind": kind, "quantity": amount, "unit": "kg",
                "note": note, "request_id": str(uuid.uuid4()),
            })
            self.assertEqual(result.status_code, 201, result.content)
        self.entry = MaterialEntry.objects.get(job=self.job, quantity=Decimal(180))
        self.output = {"answer_codes": ["material_balance"], "leads": [
            {"code": "review_entry", "record_ids": [f"entry:{self.entry.pk}"]}]}

    def post(self, path, data, client=None):
        return (client or self.manager).post(path, data, content_type="application/json")

    def analyze(self, **extra):
        return self.post(self.base, {"question": "Did the 180 kg setup cause loss?", "language": "en", **extra})

    def test_source_facts_calculations_and_180kg_causation(self):
        before = (MaterialEntry.objects.count(), Reconciliation.objects.count(), AuditEvent.objects.count())
        with patch("assistance.provider.complete", return_value=self.output) as model:
            response = self.analyze(include_notes=True)
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(body["evidence"]["calculated_findings"]["variance"], "0.000")
        self.assertEqual(body["evidence"]["calculated_findings"]["yield_rate"], "75.000")
        self.assertTrue(body["advisory"])
        self.assertIn("does not establish a cause", body["possible_leads"][0]["text"])
        self.assertIn("do not establish", body["notice"])
        self.assertTrue(body["possible_leads"][0]["evidence_needed"])
        self.assertTrue(body["possible_leads"][0]["next_step"])
        entry = next(e for e in body["evidence"]["recorded_facts"] if e["id"] == f"entry:{self.entry.pk}")
        self.assertEqual((entry["quantity"], entry["note"]), ("180.000", "setup/layout"))
        self.assertNotIn("created_by", json.dumps(model.call_args.args[1]))
        self.assertEqual(before, (MaterialEntry.objects.count(), Reconciliation.objects.count(), AuditEvent.objects.count()))

    def test_arabic_and_notes_opt_in(self):
        with patch("assistance.provider.complete", return_value=self.output) as model:
            response = self.analyze(language="ar", question="ما سبب الفرق؟")
        self.assertEqual(response.status_code, 200)
        self.assertIn("لا تثبت", response.json()["notice"])
        self.assertNotIn("note", json.dumps(model.call_args.args[1]))

    def test_unauthorized_hidden_job_and_missing_job(self):
        self.assertEqual(Client().get(self.base + "/evidence").status_code, 401)
        self.job.status = "draft"
        self.job.save()
        operator = self.clients["cutting_operator"]
        with patch("assistance.provider.complete") as model:
            self.assertEqual(operator.get(self.base + "/evidence").status_code, 404)
            self.assertEqual(self.post(self.base, {"language": "en", "question": "Summarize"}, operator).status_code, 404)
        model.assert_not_called()
        self.assertEqual(self.manager.get("/api/v1/jobs/999999/assistance/evidence").status_code, 404)
        self.assertEqual(self.clients["production_supervisor"].get(self.base + "/evidence").status_code, 200)

    def test_roles_can_read_open_evidence_and_packaging(self):
        for client in self.clients.values():
            self.assertEqual(client.get(self.base + "/evidence").status_code, 200)
            self.assertEqual(client.get("/api/v1/packaging/templates").status_code, 200)
            self.assertEqual(self.post("/api/v1/packaging/validate", concept(), client).status_code, 200)

    @patch.dict("os.environ", {}, clear=True)
    def test_missing_credentials_and_provider_errors(self):
        self.assertEqual(self.analyze().json()["code"], "ai_unavailable")
        self.assertEqual(self.post("/api/v1/packaging/propose", {"language": "en", "description": "tray"}).status_code, 503)
        self.assertEqual(self.manager.get(self.base + "/evidence").status_code, 200)
        with patch("assistance.provider.complete", side_effect=provider.ProviderError()):
            self.assertEqual(self.analyze().json()["code"], "ai_provider_error")

    def test_invented_ids_free_prose_and_injected_causes_rejected(self):
        for output in ({"facts": "180 kg caused the loss"},
                       {**self.output, "cause": "setup caused loss"},
                       {"answer_codes": ["no_proven_cause"], "leads": [{"code": "review_entry", "record_ids": ["entry:99999"]}]},
                       {"answer_codes": ["invented"], "leads": []},
                       {"answer_codes": ["no_proven_cause"], "leads": [{"code": "review_entry", "record_ids": []}]}):
            with patch("assistance.provider.complete", return_value=output):
                self.assertEqual(self.analyze().json()["code"], "ai_invalid_output")

    def test_current_permissions_rechecked_after_provider_call(self):
        def downgrade(*args):
            User.objects.filter(pk=self.users["manager"].pk).update(role="cutting_operator")
            ProductionJob.objects.filter(pk=self.job.pk).update(status="draft")
            return self.output
        with patch("assistance.provider.complete", side_effect=downgrade):
            self.assertEqual(self.analyze().status_code, 404)

    def test_revision_change_rejects_stale_advice(self):
        def mutate(*args):
            ProductionJob.objects.filter(pk=self.job.pk).update(revision=2)
            return self.output
        with patch("assistance.provider.complete", side_effect=mutate):
            self.assertEqual(self.analyze().json()["code"], "stale_revision")

    def test_unknown_input_csrf_and_throttle(self):
        self.assertEqual(self.analyze(write=True).status_code, 400)
        other = self.manager.defaults.pop("HTTP_X_CSRFTOKEN")
        self.assertEqual(self.analyze().status_code, 403)
        self.manager.defaults["HTTP_X_CSRFTOKEN"] = other
        cache.clear()
        with patch("assistance.provider.complete", return_value=self.output):
            for _ in range(6):
                self.assertEqual(self.analyze().status_code, 200)
            self.assertEqual(self.analyze().status_code, 429)

    def test_unmeasured_job_is_not_zero(self):
        job = ProductionJob.objects.create(title="No records", status="open", created_by=self.users["manager"])
        result = self.manager.get(f"/api/v1/jobs/{job.pk}/assistance/evidence").json()
        self.assertIsNone(result["calculated_findings"])
        self.assertEqual(result["recorded_facts"], [])
        self.assertIn("no_reconciliation", result["limitations"])

    def test_cutting_metrics_are_recomputed_and_separate_from_kg(self):
        from cutting.geometry import metrics
        from cutting.models import CuttingPlan
        from cutting.tests import placement, scenario
        saved = scenario(self.material.pk)
        saved["placements"] = [placement()]
        CuttingPlan.objects.create(job=self.job, name="Geometry", scenarios=[saved], created_by=self.users["manager"])
        response = self.manager.get(self.base + "/evidence").json()
        actual = response["cutting"][0]["scenarios"][0]["result"]
        self.assertEqual(actual, metrics(saved["input"], saved["placements"]))
        self.assertEqual(response["calculated_findings"]["yield_rate"], "75.000")

    def test_voided_entries_are_marked_and_excluded_from_totals(self):
        result = self.post(f"/api/v1/jobs/{self.job.pk}/materials/entries/{self.entry.pk}/void", {
            "revision": 5, "job_revision": 1, "reason": "Correction",
        })
        self.assertEqual(result.status_code, 200, result.content)
        response = self.manager.get(self.base + "/evidence").json()
        self.assertTrue(next(e for e in response["recorded_facts"] if e["id"] == f"entry:{self.entry.pk}")["voided"])
        self.assertEqual(response["calculated_findings"]["variance"], "180.000")

    def test_partial_complete_and_unsupported_ai_proposals(self):
        for template, parameters, valid in (("tray", {"length": "300"}, False),
                                             ("tray", concept()["parameters"], True),
                                             (None, {}, False)):
            with patch("assistance.provider.complete", return_value={
                    "template": template, "parameters": parameters, "name": "مفهوم"}):
                result = self.post("/api/v1/packaging/propose", {"language": "ar", "description": "صينية"}).json()
            self.assertEqual(result["valid"], valid)
            self.assertEqual(result["parameters"], parameters)
            self.assertFalse(result["production_validated"])
            self.assertEqual(bool(result["missing"]), not valid)

    def test_malformed_packaging_proposals(self):
        for proposal in ({"template": "pizza_magic", "parameters": {}, "name": "bad"},
                         {"template": "tray", "parameters": {"length": "-1"}, "name": "bad"},
                         {"template": "tray", "parameters": {"unknown": "1"}, "name": "bad"},
                         {"template": "lid_box", "parameters": concept("lid_box", lid_height="99")["parameters"], "name": "bad"}):
            with patch("assistance.provider.complete", return_value=proposal):
                result = self.post("/api/v1/packaging/propose", {"language": "en", "description": "test"})
                self.assertEqual(result.json()["code"], "ai_invalid_output")

    def test_password_change_required_blocks_new_endpoints(self):
        User.objects.filter(pk=self.users["manager"].pk).update(
            must_change_password=True, temporary_password_expires_at=timezone.now() + timezone.timedelta(hours=1))
        for path in (self.base + "/evidence", "/api/v1/packaging/templates", "/api/v1/assistance/status"):
            self.assertEqual(self.manager.get(path).status_code, 403)
