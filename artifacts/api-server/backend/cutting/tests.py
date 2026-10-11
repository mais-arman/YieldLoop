import copy
import random
import uuid
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.db import IntegrityError, close_old_connections
from django.test import Client, SimpleTestCase, TransactionTestCase
from inventory.models import InventoryEvent, OffcutLot
from jobs.models import ProductionJob
from jobs.serializers import checked
from materials import tests as fixtures
from materials.models import MaterialEntry, Reconciliation
from rest_framework.exceptions import ValidationError as ApiValidationError

from .geometry import baseline, metrics, validate_layout
from .models import CuttingPlan, PlanRevision
from .serializers import EvaluateInput


def scenario(material=1):
    return {"key": "A", "name": "Scenario A", "origin": "manual", "placements": [], "input": {
        "unit": "mm", "material_id": material, "stock_label": "User-specified board",
        "cutting_mode": "rectangular_spacing_only", "kerf": "2.000",
        "board": {"width": "100.000", "height": "80.000", "quantity": 2,
                  "left": "5.000", "right": "5.000", "top": "5.000", "bottom": "5.000"},
        "pieces": [{"key": "p1", "label": "Rectangle", "width": "30.000", "height": "20.000",
                    "quantity": 5, "rotation_allowed": False}],
    }}


def placement(x="5.000", y="5.000", number=0, board=0, rotated=False):
    return {"piece_key": "p1", "copy": number, "board": board, "x": x, "y": y, "rotated": rotated}


class GeometryTests(SimpleTestCase):
    def test_exact_fit_edge_margin_and_kerf_not_double_counted(self):
        data = scenario()["input"]
        data["board"]["width"] = "72.000"  # 5 + 30 + 2 + 30 + 5
        placements = [placement(), placement(x="37.000", number=1)]
        validate_layout(data, placements)
        for x in ("36.999", "37.001"):
            with self.assertRaises(ApiValidationError):
                validate_layout(data, [placement(), placement(x=x, number=1)])
        with self.assertRaises(ApiValidationError):
            validate_layout(data, [placement(x="4.999")])
        validate_layout(data, [placement(y="55.000")])  # exactly bottom usable edge
        with self.assertRaises(ApiValidationError):
            validate_layout(data, [placement(y="55.001")])

    def test_rotation_and_unknown_duplicate_placements(self):
        data = scenario()["input"]
        with self.assertRaises(ApiValidationError):
            validate_layout(data, [placement(rotated=True)])
        data["pieces"][0]["rotation_allowed"] = True
        validate_layout(data, [placement(rotated=True)])
        for placements in ([placement(), placement()], [placement(number=5)], [placement(board=2)]):
            with self.assertRaises(ApiValidationError):
                validate_layout(data, placements)

    def test_touching_without_kerf_and_cross_board(self):
        data = scenario()["input"]
        data["kerf"] = "0.000"
        validate_layout(data, [placement(), placement(x="35.000", number=1)])
        data["kerf"] = "2.000"
        validate_layout(data, [placement(), placement(number=1, board=1)])
        with self.assertRaises(ApiValidationError):
            validate_layout(data, [placement(), placement(x="35.000", number=1)])

    def test_determinism_multi_board_unplaced_and_rotation_fit(self):
        data = scenario()["input"]
        data["pieces"][0]["quantity"] = 30
        result = baseline(data)
        self.assertEqual(result, baseline(copy.deepcopy(data)))
        self.assertEqual({p["board"] for p in result}, {0, 1})
        self.assertGreater(metrics(data, result)["unplaced_count"], 0)
        data["pieces"][0].update(width="60", height="85", quantity=1)
        self.assertEqual(baseline(data), [])
        self.assertEqual(metrics(data, [])["unplaced"][0]["reason"], "cannot_fit")
        data["pieces"][0]["rotation_allowed"] = True
        self.assertTrue(baseline(data)[0]["rotated"])

    def test_metrics_area_denominator_and_empty(self):
        data = scenario()["input"]
        result = metrics(data, [placement()])
        self.assertEqual(result["placed_area"], "600.000000")
        self.assertEqual(result["required_area"], "3000.000000")
        self.assertEqual(result["available_area"], "16000.000000")
        self.assertEqual(result["used_board_area"], "8000.000000")
        self.assertEqual(result["unused_area"], "7400.000000")
        self.assertEqual(result["utilization"], "7.500")
        self.assertEqual(result["board_count"], 1)
        self.assertIsNone(metrics(data, [])["utilization"])
        self.assertEqual(metrics(data, [])["board_count"], 0)

    def test_fractional_precision_and_margins(self):
        data = scenario()["input"]
        data["pieces"][0].update(width="0.001", height="0.001", quantity=1)
        result = metrics(data, [placement()])
        self.assertEqual(result["placed_area"], "0.000001")
        data["board"]["left"] = "95.000"
        with self.assertRaises(ApiValidationError):
            baseline(data)

    def test_bounded_randomized_baseline_always_valid(self):
        rng = random.Random(731)
        for _ in range(70):
            data = scenario()["input"]
            data["kerf"] = str(rng.randrange(0, 10))
            data["pieces"] = [
                {"key": f"p{i}", "label": f"P{i}", "width": str(rng.randrange(1, 150)),
                 "height": str(rng.randrange(1, 150)), "quantity": rng.randrange(1, 8),
                 "rotation_allowed": bool(rng.randrange(2))}
                for i in range(6)
            ]
            layout = baseline(data)
            validate_layout(data, layout)
            self.assertEqual(layout, baseline(data))

    def test_explicit_units_dimensions_limits_and_no_defaults(self):
        for field in ("unit", "kerf", "cutting_mode"):
            s = scenario()
            del s["input"][field]
            with self.assertRaises(ApiValidationError):
                checked(EvaluateInput, {"scenario": s, "generate": True})
        for value in ("-1", "NaN", "Infinity", "1.0001", "100001", 5, "", "1e2"):
            s = scenario()
            s["input"]["board"]["width"] = value
            with self.assertRaises(ApiValidationError):
                checked(EvaluateInput, {"scenario": s, "generate": True})
        for unit in ("kg", "cm", "inch"):
            s = scenario()
            s["input"]["unit"] = unit
            with self.assertRaises(ApiValidationError):
                checked(EvaluateInput, {"scenario": s, "generate": True})


class PlanTests(TransactionTestCase):
    setUp = fixtures.MaterialTests.setUp
    client_for = fixtures.MaterialTests.client_for

    def create(self, client=None, job=None, **changes):
        body = {"name": "Test proposal", "revision": 0, "request_id": str(uuid.uuid4()),
                "reason": "Initial planning", "scenarios": [scenario(self.material.pk)], **changes}
        return (client or self.manager).post(f"/api/v1/jobs/{(job or self.job).pk}/cutting",
                                            body, content_type="application/json")

    def update(self, pk, revision=1, client=None, **changes):
        return (client or self.manager).put(f"/api/v1/jobs/{self.job.pk}/cutting/{pk}", {
            "name": "Revised", "revision": revision, "request_id": str(uuid.uuid4()), "reason": "New proposal",
            "scenarios": [scenario(self.material.pk)], **changes,
        }, content_type="application/json")

    def evaluate(self, s=None, generate=True, client=None):
        return (client or self.manager).post(f"/api/v1/jobs/{self.job.pk}/cutting/evaluate",
                                            {"scenario": s or scenario(self.material.pk), "generate": generate},
                                            content_type="application/json")

    def test_save_reopen_compare_and_history_without_accounting_effects(self):
        first = self.evaluate().json()
        second = scenario(self.material.pk)
        second["key"], second["name"] = "B", "Scenario B"
        second["input"]["board"]["width"] = "50"
        second = self.evaluate(second).json()
        self.assertNotEqual(first["result"], second["result"])
        for s in (first, second):
            s.pop("result")
        saved = self.create(scenarios=[first, second])
        self.assertEqual(saved.status_code, 201, saved.content)
        plan = saved.json()
        reopened = self.supervisor.get(f"/api/v1/jobs/{self.job.pk}/cutting/{plan['id']}").json()
        self.assertEqual(reopened, plan)
        self.assertEqual(len(reopened["scenarios"]), 2)
        history = self.manager.get(f"/api/v1/jobs/{self.job.pk}/cutting/{plan['id']}/history").json()
        self.assertEqual(history["results"][0]["scenarios"], reopened["scenarios"])
        self.assertEqual(history["results"][0]["actor"], "manager")
        for model in (MaterialEntry, Reconciliation, OffcutLot, InventoryEvent):
            self.assertEqual(model.objects.count(), 0)

    def test_stale_revision_duplicate_requests_audit_rollback(self):
        request_id = str(uuid.uuid4())
        saved = self.create(request_id=request_id)
        pk = saved.json()["id"]
        self.assertEqual(self.create(request_id=request_id).json()["code"], "duplicate_request")
        self.assertEqual(self.update(pk, request_id=request_id).status_code, 409)
        self.assertEqual(self.update(pk, revision=0).json()["code"], "stale_revision")
        with patch("cutting.views.PlanRevision.objects.create", side_effect=IntegrityError("test")):
            self.assertEqual(self.update(pk).status_code, 409)
        self.assertEqual(CuttingPlan.objects.get(pk=pk).revision, 1)
        self.assertEqual(self.update(pk).status_code, 200)
        self.assertEqual(PlanRevision.objects.count(), 2)
        with self.assertRaises(ValidationError):
            PlanRevision.objects.all().delete()
        with self.assertRaises(ValidationError):
            PlanRevision.objects.first().save()
        self.assertEqual(self.update(pk, revision=2, reason=" ").status_code, 400)

    def test_geometry_server_validation_on_evaluation_and_save(self):
        s = scenario(self.material.pk)
        s["placements"] = [placement(), placement(number=1)]
        self.assertEqual(self.evaluate(s, generate=False).json()["code"], "overlap_or_kerf")
        self.assertEqual(self.create(scenarios=[s]).status_code, 400)
        s["placements"] = [placement(rotated=True)]
        self.assertEqual(self.create(scenarios=[s]).json()["code"], "rotation_forbidden")
        s["placements"] = [placement(x="99")]
        self.assertEqual(self.create(scenarios=[s]).json()["code"], "out_of_bounds")
        s["placements"] = []
        s["origin"] = "shelf_v1"
        self.assertEqual(self.create(scenarios=[s]).json()["code"], "baseline_mismatch")
        self.assertFalse(CuttingPlan.objects.exists())

    def test_roles_draft_open_cancelled_cross_job_and_auth(self):
        saved = self.create().json()
        pk = saved["id"]
        self.assertEqual(self.create(client=self.operator).status_code, 403)
        self.assertEqual(self.evaluate(client=self.operator).status_code, 403)
        self.assertEqual(self.update(pk, client=self.operator).status_code, 403)
        self.assertEqual(self.operator.get(f"/api/v1/jobs/{self.job.pk}/cutting/{pk}").status_code, 200)
        self.assertEqual(self.update(pk, client=self.supervisor).status_code, 200)
        self.job.status = "draft"
        self.job.save()
        self.assertEqual(self.create(client=self.supervisor).status_code, 403)
        self.assertEqual(self.create().status_code, 201)
        self.assertEqual(self.operator.get(f"/api/v1/jobs/{self.job.pk}/cutting").status_code, 404)
        other = ProductionJob.objects.create(title="Other", status="open", created_by=self.users["manager"])
        self.assertEqual(self.manager.get(f"/api/v1/jobs/{other.pk}/cutting/{pk}").status_code, 404)
        self.job.status = "cancelled"
        self.job.save()
        self.assertEqual(self.update(pk, revision=2).json()["code"], "job_closed")
        self.assertEqual(self.evaluate().status_code, 409)
        self.assertFalse(self.manager.get(f"/api/v1/jobs/{self.job.pk}/cutting/{pk}").json()["can_edit"])
        self.assertEqual(Client().get(f"/api/v1/jobs/{self.job.pk}/cutting").status_code, 401)

    def test_limits_missing_material_and_spoofed_results(self):
        s = scenario(999999)
        self.assertEqual(self.create(scenarios=[s]).status_code, 404)
        s = scenario(self.material.pk)
        s["result"] = {"valid": True}
        self.assertEqual(self.create(scenarios=[s]).status_code, 400)
        self.assertEqual(self.create(scenarios=[scenario(self.material.pk)] * 2).status_code, 400)
        s = scenario(self.material.pk)
        s["input"]["pieces"][0]["quantity"] = 100
        second = copy.deepcopy(s["input"]["pieces"][0])
        second["key"] = "p2"
        s["input"]["pieces"].append(second)
        self.assertEqual(self.create(scenarios=[s]).json()["code"], "piece_limit")
        self.manager.defaults.pop("HTTP_X_CSRFTOKEN")
        self.assertEqual(self.create().status_code, 403)

    def test_history_pagination_and_concurrent_update(self):
        pk = self.create().json()["id"]
        clients = [self.client_for("manager"), self.client_for("production_supervisor")]
        def run(client):
            close_old_connections()
            try:
                return self.update(pk, client=client).status_code
            finally:
                close_old_connections()
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(run, clients))
        self.assertEqual(sorted(results), [200, 409])
        history = self.manager.get(f"/api/v1/jobs/{self.job.pk}/cutting/{pk}/history?page=2&page_size=1").json()
        self.assertEqual(history["count"], 2)
        self.assertEqual(history["results"][0]["revision"], 1)
        self.assertEqual(self.manager.get(f"/api/v1/jobs/{self.job.pk}/cutting/{pk}/history?page=3&page_size=1").status_code, 404)
