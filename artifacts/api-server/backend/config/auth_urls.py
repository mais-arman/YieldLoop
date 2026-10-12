from accounts import views
from assistance.designs import DesignHistoryView, DesignsView, DesignView
from assistance.views import (
    AnalyzeView,
    EvidenceView,
    ProposeView,
    StatusView,
    TemplatesView,
    ValidateView,
)
from cutting.panel_views import PanelKitView
from cutting.views import EvaluateView, HistoryView, PlansView, PlanView
from django.urls import path
from inventory.views import (
    BlockedReuse,
    InventoryDetail,
    InventoryView,
    InventoryVoid,
    MovementsView,
)
from jobs.views import JobsView, JobView
from materials.views import EntriesView, JobMaterialsView, MaterialsView, VoidView
from reports.comparison import ComparisonView, MachinesView
from reports.views import OverviewView

from .urls import urlpatterns as health_patterns

urlpatterns = [
    path("api/v1/packaging/panel-kit", PanelKitView.as_view()),
    path("api/v1/packaging/designs", DesignsView.as_view()),
    path("api/v1/packaging/designs/<int:pk>", DesignView.as_view()),
    path("api/v1/packaging/designs/<int:pk>/history", DesignHistoryView.as_view()),
    path("api/v1/inventory/<int:pk>/movements", MovementsView.as_view()),
    path("api/v1/jobs/machines", MachinesView.as_view()),
    path("api/v1/reports/comparison", ComparisonView.as_view()),
    path("api/v1/assistance/status", StatusView.as_view()),
    path("api/v1/jobs/<int:pk>/assistance/evidence", EvidenceView.as_view()),
    path("api/v1/jobs/<int:pk>/assistance", AnalyzeView.as_view()),
    path("api/v1/packaging/templates", TemplatesView.as_view()),
    path("api/v1/packaging/validate", ValidateView.as_view()),
    path("api/v1/packaging/propose", ProposeView.as_view()),
    path("api/v1/jobs/<int:job_id>/cutting", PlansView.as_view()),
    path("api/v1/jobs/<int:job_id>/cutting/evaluate", EvaluateView.as_view()),
    path("api/v1/jobs/<int:job_id>/cutting/<int:pk>", PlanView.as_view()),
    path("api/v1/jobs/<int:job_id>/cutting/<int:pk>/history", HistoryView.as_view()),
    path("api/v1/reports/overview", OverviewView.as_view()),
    path("api/v1/inventory", InventoryView.as_view()),
    path("api/v1/inventory/<int:pk>", InventoryDetail.as_view()),
    path("api/v1/inventory/<int:pk>/void", InventoryVoid.as_view()),
    path("api/v1/inventory/<int:pk>/<str:action>", BlockedReuse.as_view()),
    *health_patterns,
    path("api/v1/jobs", JobsView.as_view()),
    path("api/v1/jobs/<int:pk>", JobView.as_view()),
    path("api/v1/materials", MaterialsView.as_view()),
    path("api/v1/jobs/<int:pk>/materials", JobMaterialsView.as_view()),
    path("api/v1/jobs/<int:pk>/materials/entries", EntriesView.as_view()),
    path("api/v1/jobs/<int:pk>/materials/entries/<int:entry_id>/void", VoidView.as_view()),
    path("api/v1/auth/csrf", views.CsrfView.as_view()),
    path("api/v1/auth/login", views.LoginView.as_view()),
    path("api/v1/auth/logout", views.LogoutView.as_view()),
    path("api/v1/auth/me", views.MeView.as_view()),
    path("api/v1/auth/password", views.PasswordView.as_view()),
    path("api/v1/employees", views.EmployeesView.as_view()),
    path("api/v1/employees/<int:pk>", views.EmployeeView.as_view()),
    path("api/v1/employees/<int:pk>/password", views.ResetView.as_view()),
]
