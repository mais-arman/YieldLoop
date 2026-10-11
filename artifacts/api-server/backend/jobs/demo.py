"""Supplied cases only. No fabricated measurements or production timestamps."""
import os
import uuid
from decimal import Decimal
from types import SimpleNamespace

from accounts.models import User
from django.conf import settings
from django.core.management.base import CommandError
from django.db import connection, transaction
from inventory.models import InventoryEvent, OffcutLot
from inventory.services import register
from materials.models import MaterialEntry
from materials.serializers import DefinitionInput, EntryInput
from materials.services import create_material, latest, mutate

from jobs.models import JobEvent, ProductionJob
from jobs.serializers import checked
from jobs.services import create_job, ready_actor, update_job

CASES = {
    "IK-202": [("issue", "1200", ""), ("good", "900", ""),
               ("scrap", "180", "Setup/layout"), ("scrap", "60", "Damaged material"), ("offcut", "60", "")],
    "IK-203": [("issue", "1000", ""), ("good", "820", ""), ("scrap", "100", ""), ("offcut", "80", "")],
}
SPECIFICATION = "Unspecified — supplied demonstration has no material specification."


def verify_target(database, cluster):
    if settings.ENVIRONMENT != "development" or os.environ.get("REPLIT_DEPLOYMENT"):
        raise CommandError("Demo seeding is development-only.")
    expected = "test_yieldloop_phase2b" if getattr(settings, "TESTING", False) else "heliumdb"
    if database != expected or cluster != os.environ.get("YIELDLOOP_DEV_CLUSTER"):
        raise CommandError("Explicit database/cluster confirmation does not match the guarded target.")
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database(), system_identifier::text FROM pg_control_system()")
        actual = cursor.fetchone()
    if actual != (database, cluster):
        raise CommandError("Live database identity differs; no writes performed.")


def verify_case(job, rows):
    actual = list(MaterialEntry.objects.filter(job=job).order_by("pk"))
    expected = [(kind, Decimal(qty), reason) for kind, qty, reason in rows]
    if (not job.is_demo or job.machine != "CT-2" or job.status not in ("open", "completed")
            or [(entry.kind, entry.quantity, entry.scrap_reason) for entry in actual] != expected
            or any(hasattr(entry, "void") for entry in actual)):
        raise CommandError("Existing case differs from the supplied demo; refusing to overwrite records.")
    snapshot = latest(job)
    if snapshot is None or snapshot.variance != 0 or snapshot.material.name != "board" or snapshot.material.specification != SPECIFICATION:
        raise CommandError("Existing demo reconciliation/material differs.")
    offcut = next(entry for entry in actual if entry.kind == "offcut")
    lot = OffcutLot.objects.filter(source=offcut).first()
    if lot is None or InventoryEvent.objects.filter(lot=lot).count() != 1 or not InventoryEvent.objects.filter(lot=lot, action="addition").exists():
        raise CommandError("Existing demo inventory differs.")
    return {"reference": job.reference, "id": job.pk, "machine": job.machine,
            **{key: format(getattr(snapshot, key), ".3f") for key in ("issued", "good", "scrap", "offcut", "variance", "yield_rate", "scrap_rate")}}


@transaction.atomic
def seed(actor_id):
    from materials.models import Material
    try:
        actor = User.objects.get(pk=actor_id, role=User.Role.MANAGER, is_active=True, must_change_password=False)
    except User.DoesNotExist:
        raise CommandError("Choose an existing active, ready Manager; no account will be created.") from None
    # Internal command invokes the same guarded services with the selected actor.
    # No browser session or credential is created or disclosed.
    request = SimpleNamespace(user=actor, session={"_auth_user_hash": actor.get_session_auth_hash()})
    ready_actor(request)  # shared lock serializes concurrent seeds and account changes
    results = []
    for reference, rows in CASES.items():
        existing = ProductionJob.objects.filter(reference__iexact=reference).first()
        if existing:
            results.append(verify_case(existing, rows))
            continue
        if JobEvent.objects.filter(job__is_demo=True, new_reference=reference).exists():
            raise CommandError("A demonstration case was renamed; refusing to create a duplicate or rewrite its history.")
        material = Material.objects.filter(name="board", specification=SPECIFICATION).first()
        if material is None:
            material = create_material(request, checked(DefinitionInput, {
                "name": "board", "specification": SPECIFICATION, "unit": "kg",
            }))
        job, _ = create_job(request, {
            "title": f"{reference} — supplied demonstration", "reference": reference,
            "machine": "CT-2", "is_demo": True,
            "notes": "Demonstration data. Production date and physical specifications were not supplied. Record timestamps show import time.",
        })
        job, _ = update_job(request, job.pk, {"revision": job.revision, "status": "open"})
        for revision, (kind, quantity, reason) in enumerate(rows):
            mutate(request, job.pk, checked(EntryInput, {
                "revision": revision, "job_revision": job.revision, "material_id": material.pk,
                "kind": kind, "quantity": quantity, "unit": "kg", "scrap_reason": reason,
                "request_id": str(uuid.uuid4()),
            }))
        entry = MaterialEntry.objects.get(job=job, kind="offcut")
        register(request, {"job_id": job.pk, "source_entry_id": entry.pk,
                          "request_id": uuid.uuid4(), "reason": "Supplied demonstration reusable offcut registration"})
        results.append(verify_case(ProductionJob.objects.get(pk=job.pk), rows))
    return results
