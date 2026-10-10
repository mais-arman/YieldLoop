from accounts import views
from django.urls import path
from jobs.views import JobsView, JobView
from materials.views import EntriesView, JobMaterialsView, MaterialsView, VoidView

from .urls import urlpatterns as health_patterns

urlpatterns = [
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
