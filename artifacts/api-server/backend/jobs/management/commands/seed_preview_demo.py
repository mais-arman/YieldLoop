"""Dedicated-schema demo, seeded through existing application validation/services."""
import json
import os
import secrets
import uuid
from pathlib import Path

from accounts.models import User
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from rest_framework.test import APIClient

from jobs.demo import seed, verify_target


class Command(BaseCommand):
    help = "Create the isolated Preview demo once; subsequent runs preserve all edits."

    def handle(self, *args, **options):
        if settings.SETTINGS_MODULE != "config.demo_settings":
            raise CommandError("Requires config.demo_settings.")
        verify_target(os.environ.get("YIELDLOOP_DEV_DATABASE"), os.environ.get("YIELDLOOP_DEV_CLUSTER"))
        schema = settings.DEMO_SCHEMA
        with connection.cursor() as c:
            c.execute("SELECT obj_description(oid, 'pg_namespace') FROM pg_namespace WHERE nspname=%s", [schema])
            existing = c.fetchone()
            if existing:
                if existing[0] == "YieldLoop Preview demo complete":
                    self.stdout.write("Demo already initialized; no records or passwords changed.")
                    return
                if existing[0] != "YieldLoop Preview demo initializing":
                    raise CommandError("Existing schema is not owned by this demo initializer.")
            else:
                c.execute(f'CREATE SCHEMA "{schema}"')
                c.execute(f"""COMMENT ON SCHEMA "{schema}" IS 'YieldLoop Preview demo initializing'""")
        call_command("migrate", verbosity=0, interactive=False)
        credentials = {}
        with transaction.atomic():
            if User.objects.exists():
                raise CommandError("Unexpected existing accounts; refusing to overwrite.")
            for role in User.Role.values:
                password = secrets.token_urlsafe(24)
                username = f"demo_{role}"
                user = User.objects.create_user(username=username, password=password, role=role)
                credentials[role] = {"username": username, "password": password}
                if role == User.Role.MANAGER:
                    manager = user
            cases = seed(manager.pk)
            client = APIClient()
            response = client.post("/api/v1/auth/login", credentials[User.Role.MANAGER], format="json")
            if response.status_code != 200:
                raise CommandError("Demo account login failed.")

            def api(path, body=None, method="post"):
                response = getattr(client, method)("/api/v1/" + path, data=body, format="json")
                if response.status_code not in (200, 201):
                    raise CommandError(f"{method} {path}: {response.status_code} {response.data}")
                return response.data

            for title, status in [("DEMO Brochure draft", "draft"), ("DEMO Cancelled trial", "cancelled")]:
                row = api("jobs", {"title": title, "reference": title.replace(" ", "-"),
                                  "machine": "CT-3"})
                if status != "draft":
                    api(f"jobs/{row['id']}", {"revision": row["revision"], "status": status}, "patch")
            from materials.models import Material
            material = api("materials", {"name": "DEMO Kraft", "specification": "Example kraft board", "unit": "kg"})
            job = api("jobs", {"title": "DEMO Kraft production", "reference": "DEMO-KRAFT",
                              "machine": "CT-3"})
            job = api(f"jobs/{job['id']}", {"revision": job["revision"], "status": "open"}, "patch")
            for rev, (kind, quantity) in enumerate([("issue", "100"), ("good", "85"), ("scrap", "5"), ("offcut", "10")]):
                api(f"jobs/{job['id']}/materials/entries", {
                    "revision": rev, "job_revision": job["revision"], "material_id": material["id"],
                    "kind": kind, "quantity": quantity, "unit": "kg",
                    "scrap_reason": "Trim" if kind == "scrap" else "", "request_id": str(uuid.uuid4())})
            board = Material.objects.get(name="board")
            geometry = {"unit": "mm", "material_id": board.pk, "stock_label": "DEMO 500×300 board",
                        "cutting_mode": "rectangular_spacing_only", "kerf": "2",
                        "board": {"width": "500", "height": "300", "quantity": 1,
                                  "left": "10", "right": "10", "top": "10", "bottom": "10"},
                        "pieces": [{"key": "p1", "label": "DEMO panel", "width": "100", "height": "50",
                                    "quantity": 2, "rotation_allowed": True}]}
            api(f"jobs/{cases[0]['id']}/cutting", {
                "name": "DEMO Board layout", "revision": 0, "request_id": str(uuid.uuid4()), "reason": "Demo setup",
                "scenarios": [{"key": "A", "name": "Manual layout", "origin": "manual", "input": geometry,
                               "placements": [{"piece_key": "p1", "copy": 0, "board": 0, "x": "20", "y": "20", "rotated": False}]}]})
            for template, name, params in [
                ("flat_box", "DEMO Pizza-style flat carton — separate lid",
                 {"length": "350", "width": "350", "height": "40", "thickness": "3", "lid_height": "35", "clearance": "1"}),
                ("tray", "DEMO Presentation tray",
                 {"length": "200", "width": "120", "height": "60", "thickness": "2"}),
            ]:
                design = api("packaging/validate", {"template": template, "name": name, "parameters": params, "state": "assembled"})["design"]
                api("packaging/designs", {"design": design, "reason": "Validated demo concept", "request_id": str(uuid.uuid4())})
            # Keep the two reference jobs' stock untouched; use a separate Kraft lot.
            from materials.models import MaterialEntry
            source = MaterialEntry.objects.get(job_id=job["id"], kind="offcut")
            lot = api("inventory", {"job_id": job["id"], "source_entry_id": source.pk,
                                   "reason": "Demo registration", "request_id": str(uuid.uuid4())})
            receiver = api("jobs", {"title": "DEMO Reuse receiving", "reference": "DEMO-REUSE", "machine": "CT-3"})
            receiver = api(f"jobs/{receiver['id']}", {"revision": receiver["revision"], "status": "open"}, "patch")
            for revision, (action, quantity) in enumerate([("reserve", "6"), ("consume", "2"), ("release", "1")], 1):
                api(f"inventory/{lot['id']}/{action}", {"revision": revision, "job_id": receiver["id"],
                    "quantity": quantity, "reason": "Demo movement", "request_id": str(uuid.uuid4())})
            api(f"jobs/{receiver['id']}/materials/entries", {"revision": 1, "job_revision": receiver["revision"],
                "material_id": material["id"], "kind": "good", "quantity": "2", "unit": "kg",
                "scrap_reason": "", "request_id": str(uuid.uuid4())})
            api(f"jobs/{job['id']}", {"revision": job["revision"], "status": "completed"}, "patch")
            with connection.cursor() as c:
                c.execute(f"""COMMENT ON SCHEMA "{schema}" IS 'YieldLoop Preview demo complete'""")
            path = Path("/tmp/yieldloop-preview-credentials.json")
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "w") as stream:
                json.dump(credentials, stream)
        self.stdout.write("Preview demo saved. Private test credentials: /tmp/yieldloop-preview-credentials.json")
