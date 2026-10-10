from django.urls import path
from health.views import liveness, readiness

urlpatterns = [
    path("api/healthz", liveness),
    path("api/v1/health/ready", readiness),
]
