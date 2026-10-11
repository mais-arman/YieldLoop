"""Active session profile; development writes require the verified target guard.

Production remains read-only until separately approved write-enablement work.
No startup migration or production write exception is provided here.
"""
# ruff: noqa: I001
# Import ordering is intentional: session policy overrides the health profile.
import os

from django.core.exceptions import ImproperlyConfigured

from .settings import *
from .session_policy import *

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or os.environ.get("SESSION_SECRET", "")
if len(SECRET_KEY) < 32:
    raise ImproperlyConfigured("Session activation requires a stable DJANGO_SECRET_KEY.")

ROOT_URLCONF = "config.auth_urls"
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_AUTHENTICATION_CLASSES": ["accounts.security.SessionAuthentication"],
    "EXCEPTION_HANDLER": "accounts.security.exception_handler",
}
CSRF_FAILURE_VIEW = "accounts.security.csrf_failure"
# Secure remains the default even in development (Replit's browser URL uses HTTPS).
# Local HTTP requires a deliberate development-only exception.
SESSION_COOKIE_SECURE = not (
    ENVIRONMENT == "development" and os.environ.get("YIELDLOOP_LOCAL_HTTP") == "1"
)
CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE
SESSION_COOKIE_NAME = "yieldloop_session"
CSRF_COOKIE_NAME = "yieldloop_csrf"
SESSION_SERIALIZER = "django.contrib.sessions.serializers.JSONSerializer"
