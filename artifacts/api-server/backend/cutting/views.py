from accounts.models import User
from accounts.security import Conflict, ReadyAccount
from accounts.views import ProtectedView
from django.core.exceptions import ValidationError as ModelValidationError
from django.db import IntegrityError, transaction
from jobs.policy import visible_jobs
from jobs.serializers import checked
from jobs.services import ready_actor
from materials.models import Material
from materials.services import paginate, visible_job
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .geometry import baseline, fail, metrics
from .models import CuttingPlan, PlanRevision
from .serializers import EvaluateInput, ListInput, PlanInput


def can_edit(actor, job):
    return job.status not in ("cancelled", "completed") and (
        actor.role == User.Role.MANAGER or
        (actor.role == User.Role.PRODUCTION_SUPERVISOR and job.status == "open")
    )


def require_edit(actor, job):
    if actor.role == User.Role.CUTTING_OPERATOR:
        raise PermissionDenied()
    if job.status in ("cancelled", "completed"):
        raise Conflict(code="job_closed")
    if not can_edit(actor, job):
        raise PermissionDenied()


def scenario_data(scenario, generate=False):
    if not Material.objects.filter(pk=scenario["input"]["material_id"]).exists():
        raise NotFound()
    if generate:
        scenario["placements"] = baseline(scenario["input"])
        scenario["origin"] = "shelf_v1"
    elif scenario["origin"] == "shelf_v1" and scenario["placements"] != baseline(scenario["input"]):
        fail("baseline_mismatch")
    return {**scenario, "result": metrics(scenario["input"], scenario["placements"])}


def data(plan, actor):
    return {"id": plan.pk, "job_id": plan.job_id, "name": plan.name, "revision": plan.revision,
            "scenarios": plan.scenarios, "created_at": plan.created_at.isoformat(),
            "updated_at": plan.updated_at.isoformat(), "can_edit": can_edit(actor, plan.job)}


def save(request, job_id, plan_id=None):
    values = checked(PlanInput, request.data)
    try:
        with transaction.atomic():
            actor = ready_actor(request)
            job = visible_job(actor, job_id, lock=True)
            require_edit(actor, job)
            if PlanRevision.objects.filter(request_id=values["request_id"]).exists():
                raise Conflict(code="duplicate_request")
            plan = None
            if plan_id:
                plan = CuttingPlan.objects.filter(pk=plan_id, job=job).first()
                if plan is None:
                    raise NotFound()
            if values["revision"] != (plan.revision if plan else 0):
                raise Conflict(code="stale_revision")
            if len({s["key"] for s in values["scenarios"]}) != len(values["scenarios"]):
                fail("duplicate_scenario_key")
            scenarios = [scenario_data(s) for s in values["scenarios"]]
            if plan:
                plan.revision += 1
                plan.name, plan.scenarios = values["name"], scenarios
                plan.save(update_fields=["revision", "name", "scenarios", "updated_at"])
            else:
                plan = CuttingPlan.objects.create(job=job, name=values["name"], scenarios=scenarios, created_by=actor)
            PlanRevision.objects.create(plan=plan, revision=plan.revision, name=plan.name, scenarios=scenarios,
                                        actor=actor, reason=values["reason"], request_id=values["request_id"])
            return data(plan, actor)
    except (IntegrityError, ModelValidationError):
        raise Conflict(code="plan_conflict") from None


class PlansView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def get(self, request, job_id):
        job = visible_job(request.user, job_id)
        values = checked(ListInput, request.query_params)
        return Response(paginate(CuttingPlan.objects.filter(job=job).select_related("job"), values, lambda p: {
            "id": p.pk, "name": p.name, "revision": p.revision, "updated_at": p.updated_at.isoformat(),
        }))

    def post(self, request, job_id):
        return Response(save(request, job_id), status=201)


class PlanView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def get(self, request, job_id, pk):
        job = visible_job(request.user, job_id)
        plan = CuttingPlan.objects.select_related("job").filter(pk=pk, job=job).first()
        if plan is None:
            raise NotFound()
        return Response(data(plan, request.user))

    def put(self, request, job_id, pk):
        return Response(save(request, job_id, pk))


class EvaluateView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def post(self, request, job_id):
        values = checked(EvaluateInput, request.data)
        with transaction.atomic():
            actor = ready_actor(request)
            job = visible_job(actor, job_id, lock=True)
            require_edit(actor, job)
            return Response(scenario_data(values["scenario"], values["generate"]))


class HistoryView(ProtectedView):
    permission_classes = (IsAuthenticated, ReadyAccount)

    def get(self, request, job_id, pk):
        job = visible_jobs(request.user).filter(pk=job_id).first()
        if job is None or not CuttingPlan.objects.filter(pk=pk, job=job).exists():
            raise NotFound()
        values = checked(ListInput, request.query_params)
        return Response(paginate(PlanRevision.objects.filter(plan_id=pk).select_related("actor"), values, lambda h: {
            "revision": h.revision, "name": h.name, "scenarios": h.scenarios, "reason": h.reason,
            "actor": h.actor.username, "created_at": h.created_at.isoformat(),
        }))
