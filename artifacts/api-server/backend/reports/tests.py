import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from django.db import close_old_connections, connection
from django.test import Client, TransactionTestCase
from inventory.models import InventoryEvent, OffcutLot
from jobs.models import ProductionJob
from materials import tests as fixtures
from materials.models import Material, MaterialEntry, Reconciliation


class ReportTests(TransactionTestCase):
    setUp = fixtures.MaterialTests.setUp
    client_for = fixtures.MaterialTests.client_for
    current = fixtures.MaterialTests.current
    payload = fixtures.MaterialTests.payload
    add = fixtures.MaterialTests.add
    record = fixtures.MaterialTests.record
    void = fixtures.MaterialTests.void

    def report(self, client=None, **filters):
        response = (client or self.manager).get("/api/v1/reports/overview", filters)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def lot(self, quantity="60"):
        state = self.record("offcut", quantity)
        source = MaterialEntry.objects.get(pk=state["entries"]["results"][0]["id"])
        lot = OffcutLot.objects.create(
            source=source, reconciliation=Reconciliation.objects.get(entry=source, action="record"),
            created_by=self.users["manager"], request_id=uuid.uuid4(),
        )
        InventoryEvent.objects.create(lot=lot, action="addition", reason="Test registration",
                                      actor=self.users["manager"], request_id=uuid.uuid4())
        return lot

    def new_job(self, status="open"):
        return ProductionJob.objects.create(title="Report fixture", status=status, created_by=self.users["manager"])

    def test_empty_missing_measurements_and_zero_denominators(self):
        result = self.report()
        self.assertEqual(result["job_count"], 1)
        self.assertEqual(result["unmeasured_jobs"], 1)
        self.assertIsNone(result["production"])
        self.assertIsNone(result["jobs"]["results"][0]["reconciliation"])
        result = self.report(material_id=self.material.pk)
        self.assertEqual(result["job_count"], 0)
        self.assertEqual(result["production"]["issued"], "0.000")
        self.assertIsNone(result["production"]["yield_rate"])
        state = self.record(quantity="0.100")
        self.assertEqual(self.void(state["entries"]["results"][0]["id"]).status_code, 200)
        result = self.report(material_id=self.material.pk)
        self.assertEqual(result["measured_jobs"], 1)
        self.assertEqual(result["unmeasured_jobs"], 0)
        self.assertIsNone(result["production"]["scrap_rate"])
        self.assertIsNone(result["production"]["offcut_rate"])

    def test_latest_snapshots_corrected_records_and_inventory_do_not_double_count(self):
        self.record(quantity="1200")
        self.record("good", "900")
        scrap = self.record("scrap", "250")["entries"]["results"][0]["id"]
        self.assertEqual(self.void(scrap).status_code, 200)
        self.record("scrap", "240")
        lot = self.lot()
        before = self.report(material_id=self.material.pk)
        expected = {"issued": "1200.000", "good": "900.000", "scrap": "240.000", "offcut": "60.000",
                    "pending_rework": "0.000", "accounted": "1200.000", "variance": "0.000", "yield_rate": "75.000",
                    "scrap_rate": "20.000", "offcut_rate": "5.000"}
        self.assertEqual(before["production"], expected)
        row = before["jobs"]["results"][0]["reconciliation"]
        for key, value in expected.items():
            self.assertEqual(row[key], value)
        self.assertEqual(row["revision"], 6)
        self.assertEqual(before["inventory"]["available"], {"count": 1, "original_quantity": "60.000", "remaining": "60.000"})
        InventoryEvent.objects.create(lot=lot, action="void", reason="Remove registration",
                                      actor=self.users["manager"], request_id=uuid.uuid4())
        after = self.report(material_id=self.material.pk)
        self.assertEqual(after["production"], before["production"])
        self.assertEqual(after["inventory"]["voided"], {"count": 1, "original_quantity": "60.000", "remaining": "0.000"})
        self.assertEqual(after["inventory"]["available"]["count"], 0)
        self.assertEqual(after["lots"]["results"][0]["state"], "voided")

    def test_weighted_rates_fractional_values_and_signed_variance(self):
        self.record(quantity="0.300")
        self.record("good", "0.100")
        old_job = self.job
        self.job = self.new_job()
        self.url = f"/api/v1/jobs/{self.job.pk}/materials"
        self.record(quantity="0.700")
        self.record("good", "0.600")
        self.record("scrap", "0.400")
        result = self.report(material_id=self.material.pk)
        self.assertEqual(result["production"]["yield_rate"], "70.000")
        self.assertEqual(result["production"]["variance"], "-0.100")
        self.assertEqual(result["production"]["scrap"], "0.400")
        rows = result["jobs"]["results"]
        self.assertEqual(next(row for row in rows if row["id"] == old_job.pk)["reconciliation"]["yield_rate"], "33.333")
        for field in ("issued", "good", "scrap", "offcut", "accounted", "variance"):
            self.assertEqual(sum(Decimal(row["reconciliation"][field]) for row in rows), Decimal(result["production"][field]))

    def test_different_materials_never_combined(self):
        self.record(quantity="10")
        self.lot("1")
        first_material = self.material
        self.job = self.new_job()
        self.url = f"/api/v1/jobs/{self.job.pk}/materials"
        self.material = Material.objects.create(name="Another", specification="Different", unit="kg", created_by=self.users["manager"])
        self.record(quantity="90")
        self.lot("9")
        result = self.report()
        self.assertEqual(result["job_count"], 2)
        self.assertIsNone(result["production"])
        self.assertIsNone(result["inventory"]["available"]["remaining"])
        self.assertEqual(result["inventory"]["available"]["count"], 2)
        self.assertEqual(self.report(material_id=first_material.pk)["production"]["issued"], "10.000")
        self.assertEqual(self.report(material_id=self.material.pk)["inventory"]["available"]["remaining"], "9.000")

    def test_dates_inclusive_local_midnight_exclusive_next_day_and_dst(self):
        # Jerusalem DST starts March 27, 2026: local day is 23 hours.
        timestamps = [
            "2026-03-26T21:59:59+00:00",  # before local March27
            "2026-03-26T22:00:00+00:00",  # local midnight, included
            "2026-03-27T20:59:59+00:00",  # last second, included
            "2026-03-27T21:00:00+00:00",  # local March28 excluded
        ]
        jobs = [self.job, self.new_job(), self.new_job(), self.new_job()]
        for job, value in zip(jobs, timestamps, strict=True):
            ProductionJob.objects.filter(pk=job.pk).update(created_at=datetime.fromisoformat(value))
        local = self.report(start_date="2026-03-27", end_date="2026-03-27", timezone="Asia/Jerusalem")
        self.assertEqual({row["id"] for row in local["jobs"]["results"]}, {jobs[1].pk, jobs[2].pk})
        utc = self.report(start_date="2026-03-27", end_date="2026-03-27", timezone="UTC")
        self.assertEqual({row["id"] for row in utc["jobs"]["results"]}, {jobs[2].pk, jobs[3].pk})
        self.assertEqual(self.report(end_date="2026-03-26", timezone="UTC")["job_count"], 2)
        self.assertEqual(self.report(start_date="2026-03-28")["job_count"], 0)

    def test_job_date_cohort_includes_later_correction_and_inventory(self):
        ProductionJob.objects.filter(pk=self.job.pk).update(created_at=datetime(2025, 1, 1, tzinfo=UTC))
        self.record(quantity="10")
        self.lot("1")
        result = self.report(material_id=self.material.pk, start_date="2025-01-01", end_date="2025-01-01")
        self.assertEqual(result["production"]["offcut"], "1.000")
        self.assertEqual(result["lots"]["count"], 1)
        self.assertEqual(self.report(start_date="2026-01-01")["lots"]["count"], 0)
        self.assertEqual(result["date_basis"], "job_created_at")

    def test_role_scope_status_and_hidden_material(self):
        self.record(quantity="10")
        self.lot("1")
        self.new_job("draft")
        cancelled = self.new_job("cancelled")
        ProductionJob.objects.filter(pk=self.job.pk).update(status="cancelled")
        for params in ({}, {"material_id": self.material.pk}, {"status": "cancelled"}):
            self.assertEqual(self.operator.get("/api/v1/reports/overview", params).status_code, 403)
        for client in (self.manager, self.supervisor):
            result = self.report(client)
            self.assertEqual(result["job_counts"], {"draft": 1, "open": 0, "cancelled": 2, "completed": 0})
            self.assertEqual(result["lots"]["count"], 1)
            self.assertIn(cancelled.pk, [row["id"] for row in result["jobs"]["results"]])
        ProductionJob.objects.filter(pk=self.job.pk).update(status="open")
        self.assertEqual(self.operator.get("/api/v1/reports/overview", {"material_id": self.material.pk}).status_code, 403)
        allowed = self.report(self.supervisor, material_id=self.material.pk)
        self.assertEqual(allowed["job_count"], 1)
        for row in allowed["jobs"]["results"]:
            self.assertEqual(self.operator.get(f"/api/v1/jobs/{row['id']}").status_code, 200)
        for row in allowed["lots"]["results"]:
            self.assertEqual(self.operator.get(f"/api/v1/inventory/{row['id']}").status_code, 200)

    def test_pagination_totals_and_invalid_filters(self):
        self.record(quantity="10")
        for _ in range(3):
            self.lot("1")
            self.new_job()
        first = self.report(page_size=2)
        second = self.report(page_size=2, job_page=2, lot_page=2)
        self.assertEqual(first["job_count"], second["job_count"])
        self.assertEqual(first["inventory"], second["inventory"])
        self.assertEqual(first["jobs"]["count"], 4)
        self.assertEqual(len(second["jobs"]["results"]), 2)
        self.assertEqual(len(second["lots"]["results"]), 1)
        self.assertTrue({r["id"] for r in first["jobs"]["results"]}.isdisjoint(r["id"] for r in second["jobs"]["results"]))
        for query in (
            {"start_date": "bad"}, {"timezone": "Mars"}, {"status": "unknown"},
            {"start_date": "2026-03-02", "end_date": "2026-03-01"},
            {"end_date": "9999-12-31"}, {"page_size": 101}, {"job_page": 0}, {"role": "manager"},
        ):
            response = self.manager.get("/api/v1/reports/overview", query)
            self.assertEqual(response.status_code, 400, query)
        self.assertEqual(self.manager.get("/api/v1/reports/overview?lot_page=100").status_code, 404)
        self.assertEqual(self.manager.get("/api/v1/reports/overview?material_id=999999").status_code, 404)

    def test_auth_restrictions_and_read_only(self):
        self.assertEqual(Client().get("/api/v1/reports/overview").status_code, 401)
        self.users["manager"].must_change_password = True
        self.users["manager"].temporary_password_expires_at = datetime.now(UTC) + timedelta(hours=1)
        self.users["manager"].save()
        self.assertEqual(self.manager.get("/api/v1/reports/overview").status_code, 403)
        before = (Reconciliation.objects.count(), MaterialEntry.objects.count(), OffcutLot.objects.count())
        self.report(self.supervisor)
        self.assertEqual((Reconciliation.objects.count(), MaterialEntry.objects.count(), OffcutLot.objects.count()), before)
        self.assertEqual(self.supervisor.post("/api/v1/reports/overview").status_code, 405)

    def test_consistent_database_snapshot_and_bounded_queries(self):
        self.record(quantity="10")
        for _ in range(5):
            self.lot("1")
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as queries:
            self.report(material_id=self.material.pk)
        # Permission/session lookups plus fixed aggregates and two bounded pages.
        self.assertLess(len(queries), 30)
        self.assertTrue(any("REPEATABLE READ, READ ONLY" in query["sql"] for query in queries))

    def test_correction_during_report_does_not_mix_snapshots(self):
        self.record(quantity="10")
        payload = self.payload("good", "4")
        writer = self.client_for("production_supervisor")
        triggered = False

        def write():
            close_old_connections()
            try:
                return writer.post(f"{self.url}/entries", payload, content_type="application/json").status_code
            finally:
                close_old_connections()

        def concurrent_write(execute, sql, params, many, context):
            nonlocal triggered
            result = execute(sql, params, many, context)
            if not triggered and "COUNT(" in sql:
                triggered = True
                with ThreadPoolExecutor(max_workers=1) as pool:
                    self.assertEqual(pool.submit(write).result(timeout=20), 201)
            return result

        with connection.execute_wrapper(concurrent_write):
            result = self.report(material_id=self.material.pk)
        self.assertTrue(triggered)
        self.assertEqual(result["production"]["good"], "0.000")
        self.assertEqual(result["jobs"]["results"][0]["reconciliation"]["good"], "0.000")
        self.assertEqual(self.report(material_id=self.material.pk)["production"]["good"], "4.000")
