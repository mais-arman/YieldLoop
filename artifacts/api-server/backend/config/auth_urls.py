from accounts import views
from cutting.views import EvaluateView, HistoryView, PlansView, PlanView
from django.urls import path
from inventory.views import BlockedReuse, InventoryDetail, InventoryView, InventoryVoid
from jobs.views import JobsView, JobView
from materials.views import EntriesView, JobMaterialsView, MaterialsView, VoidView
from reports.views import OverviewView

from .urls import urlpatterns as health_patterns

urlpatterns = [
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
