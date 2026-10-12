"""Small, permission-scoped comparison and unresolved-work context."""
import re

from django.db.models import OuterRef, Subquery
from django.db.models.functions import Lower
from jobs.policy import visible_jobs
from materials.models import Reconciliation

from .evidence import collect


def collect_context(user, job_id, question):
    tokens = re.findall(r"[\w-]+", question.lower())[:300]
    related = visible_jobs(user).exclude(pk=job_id).exclude(reference="").annotate(
        ref_lower=Lower("reference")).filter(ref_lower__in=tokens).order_by("pk")[:2]
    evidence = [collect(user, job.pk) for job in related]
    latest = Reconciliation.objects.filter(job_id=OuterRef("pk")).order_by("-revision")
    jobs = visible_jobs(user).annotate(
        variance=Subquery(latest.values("variance")[:1]),
        pending=Subquery(latest.values("pending_rework")[:1]),
        material_revision=Subquery(latest.values("revision")[:1]),
    ).exclude(variance__isnull=True).exclude(variance=0, pending=0).order_by("pk")[:21]
    rows = [{"job_id": j.pk, "reference": j.reference or j.job_number, "revision": j.material_revision,
             "variance": format(j.variance, ".3f"), "pending_rework": format(j.pending, ".3f"),
             "href": f"/jobs/{j.pk}"} for j in jobs]
    return {"related_evidence": evidence, "attention_jobs": rows[:20], "attention_truncated": len(rows) > 20}


def signature(context):
    return ([(e["job"], e["material_revision"]) for e in context["related_evidence"]],
            context["attention_jobs"], context["attention_truncated"])
