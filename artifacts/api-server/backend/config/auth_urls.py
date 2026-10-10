from accounts import views
from django.urls import path

from .urls import urlpatterns as health_patterns

urlpatterns = [
    *health_patterns,
    path("api/v1/auth/csrf", views.CsrfView.as_view()),
    path("api/v1/auth/login", views.LoginView.as_view()),
    path("api/v1/auth/logout", views.LogoutView.as_view()),
    path("api/v1/auth/me", views.MeView.as_view()),
    path("api/v1/auth/password", views.PasswordView.as_view()),
    path("api/v1/employees", views.EmployeesView.as_view()),
    path("api/v1/employees/<int:pk>", views.EmployeeView.as_view()),
    path("api/v1/employees/<int:pk>/password", views.ResetView.as_view()),
]
