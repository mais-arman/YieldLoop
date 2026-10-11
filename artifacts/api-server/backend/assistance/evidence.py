"""Authorized, revision-consistent records; AI never supplies these facts or totals."""
from cutting.models import CuttingPlan
from cutting.views import scenario_data
from django.db import transaction
from django.utils import timezone
from materials.services import state, visible_job


@transaction.atomic
def collect(user, job_id, include_notes=False):
    job = visible_job(user, job_id, lock=True)
    material = state(job, user, {"page": 1, "page_size": 100})
    facts = [{
        "id": f"entry:{e['id']}", "kind": e["kind"], "quantity": e["quantity"],
        "unit": e["unit"], "created_at": e["created_at"], "voided": e["void"] is not None,
        **({"note": e["note"]} if include_notes else {}),
    } for e in material["entries"]["results"]]
    plans = CuttingPlan.objects.filter(job=job)[:5]
    cutting = [{"plan_id": p.pk, "revision": p.revision, "name": p.name,
                "scenarios": [scenario_data(s) for s in p.scenarios]} for p in plans]
    limitations = ["no_proven_cause", "weight_not_geometry", "offcut_not_consumable"]
    if material["entries"]["count"] > 100:
        limitations.append("entries_truncated")
    if CuttingPlan.objects.filter(job=job).count() > 5:
        limitations.append("plans_truncated")
    if material["summary"] is None:
        limitations.append("no_reconciliation")
    return {"job": {"id": job.pk, "job_number": job.job_number, "status": job.status, "revision": job.revision},
            "material_revision": material["revision"], "generated_at": timezone.now().isoformat(),
            "recorded_facts": facts, "calculated_findings": material["summary"], "cutting": cutting,
            "limitations": limitations}
