from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from accounts.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, close_old_connections, transaction
from django.test import Client, TransactionTestCase
from django.utils import timezone

from .models import JobEvent, ProductionJob

PASSWORD = "Isolated-test-only-952!password"
BASE = "/api/v1/jobs"


class ProductionJobTests(TransactionTestCase):
    def setUp(self):
        self.users = {
            role: User.objects.create_user(username=role, password=PASSWORD, role=role)
            for role in User.Role.values
        }
        self.manager = self.client_for("manager")
        self.supervisor = self.client_for("production_supervisor")
        self.operator = self.client_for("cutting_operator")

    def client_for(self, username):
        client = Client(enforce_csrf_checks=True)
        token = client.get("/api/v1/auth/csrf").json()["csrfToken"]
        response = client.post("/api/v1/auth/login", {
            "username": username, "password": PASSWORD,
        }, content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)
        client.defaults["HTTP_X_CSRFTOKEN"] = response.json()["csrfToken"]
        return client

    def create(self, title="Production order", **extra):
        response = self.manager.post(BASE, {"title": title, **extra}, content_type="application/json")
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def update(self, client, job, **values):
        return client.patch(
            f"{BASE}/{job['id']}", {"revision": job["revision"], **values},
            content_type="application/json",
        )

    def test_create_persist_reload_and_audit(self):
        job = self.create("أمر إنتاج", notes="Production notes")
        persisted = ProductionJob.objects.get(pk=job["id"])
        self.assertEqual(persisted.title, "أمر إنتاج")
        self.assertRegex(job["job_number"], r"^YL-[0-9A-F]{12}$")
        self.assertEqual(job["status"], "draft")
        self.assertEqual(job["created_by"]["id"], self.users["manager"].pk)
        fresh = self.client_for("manager").get(f"{BASE}/{job['id']}").json()
        self.assertEqual(fresh, job)
        event = JobEvent.objects.get(job=persisted)
        self.assertEqual(event.actor_id, self.users["manager"].pk)
        self.assertEqual(event.new_notes, "Production notes")
        self.assertIsNone(event.old_title)

    def test_server_owned_fields_and_strict_input(self):
        for field, value in [
            ("created_by", self.users["cutting_operator"].pk), ("role", "manager"),
            ("status", "open"), ("job_number", "FAKE"), ("revision", 50),
            ("material_quantity", 10), ("id", 999),
        ]:
            result = self.manager.post(BASE, {"title": "Safe", field: value}, content_type="application/json")
            self.assertEqual(result.status_code, 400)
        self.assertEqual(ProductionJob.objects.count(), 0)

    def test_validation_and_error_codes(self):
        for data in [{}, {"title": ""}, {"title": " \n "}, {"title": "a" * 201},
                     {"title": "ok", "notes": "a" * 5001}, [], {"title": None}]:
            response = self.manager.post(BASE, data, content_type="application/json")
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.json()["code"], "validation_error")
            self.assertIn("fields", response.json())
        self.create("a" * 200, notes="a" * 5000)

    def test_database_constraints(self):
        job = ProductionJob.objects.create(title="Valid", created_by=self.users["manager"])
        for change in [{"title": " "}, {"status": "completed"}, {"revision": 0}, {"job_number": "bad"}]:
            with self.assertRaises(IntegrityError), transaction.atomic():
                ProductionJob.objects.filter(pk=job.pk).update(**change)
        with self.assertRaises(IntegrityError), transaction.atomic():
            ProductionJob.objects.create(title="Duplicate", created_by=self.users["manager"], job_number=job.job_number)

    def test_manager_edit_open_cancel_and_terminal_rules(self):
        job = self.create()
        response = self.update(self.manager, job, title="Revised", notes="New notes")
        self.assertEqual(response.status_code, 200)
        job = response.json()
        self.assertEqual(job["revision"], 2)
        opened = self.update(self.manager, job, status="open").json()
        cancelled = self.update(self.manager, opened, status="cancelled").json()
        self.assertEqual(cancelled["status"], "cancelled")
        self.assertEqual(cancelled["permissions"]["transitions"], [])
        for status in ("open", "draft", "cancelled"):
            response = self.update(self.manager, cancelled, status=status)
            self.assertEqual(response.status_code, 409)
            self.assertEqual(response.json()["code"], "job_closed")
        self.assertEqual(self.update(self.manager, cancelled, notes="late").status_code, 409)
        event = JobEvent.objects.filter(job_id=job["id"]).first()
        self.assertEqual((event.old_status, event.new_status), ("open", "cancelled"))

    def test_draft_cancellation(self):
        job = self.create()
        response = self.update(self.manager, job, status="cancelled")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "cancelled")

    def test_invalid_transitions_and_empty_changes(self):
        job = self.create()
        response = self.update(self.manager, job, status="draft")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "invalid_transition")
        self.assertEqual(self.update(self.manager, job, status="completed").status_code, 400)
        self.assertEqual(self.update(self.manager, job).status_code, 400)
        opened = self.update(self.manager, job, status="open").json()
        response = self.update(self.manager, opened, status="draft")
        self.assertEqual(response.json()["code"], "invalid_transition")
        self.assertEqual(response.status_code, 400)

    def test_supervisor_operational_permissions(self):
        self.assertEqual(self.supervisor.post(BASE, {"title": "No"}, content_type="application/json").status_code, 403)
        job = self.create()
        self.assertEqual(self.supervisor.get(f"{BASE}/{job['id']}").status_code, 200)
        for change in [{"title": "No"}, {"notes": "No"}, {"status": "cancelled"}]:
            self.assertEqual(self.update(self.supervisor, job, **change).status_code, 403)
        response = self.update(self.supervisor, job, status="open")
        self.assertEqual(response.status_code, 200)
        opened = response.json()
        self.assertEqual(self.update(self.supervisor, opened, title="No").status_code, 403)
        self.assertEqual(self.update(self.supervisor, opened, status="cancelled").status_code, 403)
        result = self.update(self.supervisor, opened, notes="Operational note")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["notes"], "Operational note")
        self.assertEqual(JobEvent.objects.first().actor_id, self.users["production_supervisor"].pk)

    def test_operator_scope_counts_search_and_object_access(self):
        draft = self.create("Hidden draft")
        opened = self.update(self.manager, self.create("Visible"), status="open").json()
        cancelled = self.update(self.manager, self.create("Hidden cancelled"), status="cancelled").json()
        self.assertEqual(self.operator.get(BASE).json()["count"], 1)
        self.assertEqual(self.operator.get(BASE, {"search": "Hidden"}).json()["count"], 0)
        self.assertEqual(self.operator.get(BASE, {"status": "draft"}).json()["results"], [])
        for job in (draft, cancelled):
            self.assertEqual(self.operator.get(f"{BASE}/{job['id']}").status_code, 404)
            self.assertEqual(self.update(self.operator, job, notes="No").status_code, 404)
        self.assertEqual(self.operator.get(f"{BASE}/{opened['id']}").status_code, 200)
        for change in [{"title": "No"}, {"notes": "No"}, {"status": "cancelled"}]:
            self.assertEqual(self.update(self.operator, opened, **change).status_code, 403)
        self.assertEqual(self.operator.post(BASE, {"title": "No"}, content_type="application/json").status_code, 403)

    def test_pagination_search_status_and_stable_order(self):
        jobs = [self.create(f"Batch {n}", notes="Find by notes" if n == 0 else "") for n in range(5)]
        opened = self.update(self.manager, jobs[0], status="open").json()
        first = self.manager.get(BASE, {"page_size": 2}).json()
        second = self.manager.get(BASE, {"page": 2, "page_size": 2}).json()
        self.assertEqual((first["count"], first["total_pages"]), (5, 3))
        self.assertEqual([j["id"] for j in first["results"]], [jobs[4]["id"], jobs[3]["id"]])
        self.assertFalse({j["id"] for j in first["results"]} & {j["id"] for j in second["results"]})
        self.assertEqual(self.manager.get(BASE, {"search": "by notes"}).json()["count"], 1)
        self.assertEqual(self.manager.get(BASE, {"search": opened["job_number"].lower()}).json()["count"], 1)
        self.assertEqual(self.manager.get(BASE, {"search": "BATCH", "status": "open"}).json()["count"], 1)
        for params in [{"page": 0}, {"page": "x"}, {"page_size": 101}, {"status": "bad"}, {"search": "x" * 121}]:
            self.assertEqual(self.manager.get(BASE, params).status_code, 400)
        self.assertEqual(self.manager.get(BASE, {"page": 99}).status_code, 404)

    def test_empty_list_and_unknown_id(self):
        result = self.manager.get(BASE).json()
        self.assertEqual(result, {"count": 0, "page": 1, "page_size": 20, "total_pages": 1, "results": []})
        self.assertEqual(self.manager.get(f"{BASE}/999").status_code, 404)
        self.assertEqual(self.manager.delete(f"{BASE}/999").status_code, 405)

    def test_csrf_anonymous_restricted_and_revoked_sessions(self):
        self.assertEqual(Client().get(BASE).status_code, 401)
        job = self.create()
        no_csrf = Client(enforce_csrf_checks=True)
        no_csrf.cookies = self.manager.cookies
        self.assertEqual(no_csrf.post(BASE, {"title": "No"}, content_type="application/json").status_code, 403)
        self.assertEqual(no_csrf.patch(f"{BASE}/{job['id']}", {}, content_type="application/json").status_code, 403)
        user = self.users["manager"]
        user.must_change_password = True
        user.temporary_password_expires_at = timezone.now() + timezone.timedelta(hours=1)
        user.save()
        self.assertEqual(self.manager.get(BASE).status_code, 403)
        self.assertEqual(self.update(self.manager, job, notes="No").status_code, 403)
        user.is_active = False
        user.save()
        self.assertEqual(self.manager.get(BASE).status_code, 401)

    def test_stale_revision_rejected_without_overwrite(self):
        job = self.create()
        winner = self.update(self.manager, job, notes="Keep").json()
        stale = self.update(self.manager, job, title="Lose")
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.json()["code"], "stale_revision")
        self.assertEqual(self.manager.get(f"{BASE}/{job['id']}").json(), winner)
        missing = self.manager.patch(f"{BASE}/{job['id']}", {"notes": "No"}, content_type="application/json")
        self.assertEqual(missing.status_code, 400)

    def test_concurrent_updates_have_only_one_winner(self):
        job = self.create()
        cookies = self.manager.cookies.copy()
        token = self.manager.defaults["HTTP_X_CSRFTOKEN"]

        def write(note):
            close_old_connections()
            try:
                client = Client(enforce_csrf_checks=True)
                client.cookies = cookies.copy()
                client.defaults["HTTP_X_CSRFTOKEN"] = token
                return self.update(client, job, notes=note).status_code
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            outcomes = list(pool.map(write, ["First", "Second"]))
        self.assertEqual(sorted(outcomes), [200, 409])
        self.assertEqual(JobEvent.objects.filter(job_id=job["id"]).count(), 2)

    def test_audit_failure_rolls_back_and_audit_is_append_only(self):
        job = self.create()
        with patch("jobs.services.record_event", side_effect=RuntimeError("test")), self.assertRaises(RuntimeError):
            self.update(self.manager, job, notes="Must roll back")
        self.assertEqual(ProductionJob.objects.get(pk=job["id"]).notes, "")
        event = JobEvent.objects.get(job_id=job["id"])
        for operation in (event.delete, event.save, lambda: JobEvent.objects.all().update(new_title="No")):
            with self.assertRaises(ValidationError):
                operation()

    def test_noop_does_not_increment_and_notes_can_be_cleared(self):
        job = self.create(notes="Clear me")
        same = self.update(self.manager, job, notes="Clear me").json()
        self.assertEqual(same["revision"], 1)
        cleared = self.update(self.manager, job, notes="").json()
        self.assertEqual(cleared["notes"], "")
        self.assertEqual(cleared["revision"], 2)
