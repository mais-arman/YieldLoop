"""Single-business policy. Operators are permitted to read Open jobs only."""
from accounts.models import User
from rest_framework.exceptions import PermissionDenied

from .models import ProductionJob

TRANSITIONS = {"draft": {"open", "cancelled"}, "open": {"cancelled", "completed"}, "cancelled": set(), "completed": set()}


def visible_jobs(user):
    queryset = ProductionJob.objects.select_related("created_by")
    if user.role == User.Role.CUTTING_OPERATOR:
        return queryset.filter(status=ProductionJob.Status.OPEN)
    if user.role in (User.Role.MANAGER, User.Role.PRODUCTION_SUPERVISOR):
        return queryset
    return queryset.none()


def require_creator(user):
    if user.role != User.Role.MANAGER:
        raise PermissionDenied()


def require_editor(user):
    if user.role not in (User.Role.MANAGER, User.Role.PRODUCTION_SUPERVISOR):
        raise PermissionDenied()


def capabilities(user, job):
    fields = {"edit_reference": user.role == User.Role.MANAGER and job.status in ("draft", "open"),
              "edit_machine": (user.role == User.Role.MANAGER and job.status in ("draft", "open")) or
              (user.role in (User.Role.CUTTING_OPERATOR, User.Role.PRODUCTION_SUPERVISOR) and job.status == "open")}
    if job.status in ("cancelled", "completed"):
        return {**fields, "edit_title": False, "edit_notes": False, "transitions": []}
    if user.role == User.Role.MANAGER:
        return {
            **fields,
            "edit_title": True, "edit_notes": True,
            "transitions": sorted(TRANSITIONS[job.status]),
        }
    if user.role == User.Role.PRODUCTION_SUPERVISOR:
        return {
            **fields,
            "edit_title": False, "edit_notes": job.status == ProductionJob.Status.OPEN,
            "transitions": ["open"] if job.status == ProductionJob.Status.DRAFT else ["completed"],
        }
    return {**fields, "edit_title": False, "edit_notes": False,
            "transitions": ["completed"] if user.role == User.Role.CUTTING_OPERATOR and job.status == "open" else []}


def require_recorder(user):
    if user.role not in (User.Role.MANAGER, User.Role.PRODUCTION_SUPERVISOR, User.Role.CUTTING_OPERATOR):
        raise PermissionDenied()
