"""Schema-free Phase 1 settings. Secrets are supplied only through environment."""
import os
import secrets

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

ENVIRONMENT = os.environ.get("DJANGO_ENV", "development")
if ENVIRONMENT not in {"development", "production", "test"}:
    raise ImproperlyConfigured("DJANGO_ENV must be development, test, or production.")
PRODUCTION = ENVIRONMENT == "production"
DEBUG = False
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if PRODUCTION and len(SECRET_KEY) < 50:
    raise ImproperlyConfigured("Production requires DJANGO_SECRET_KEY of at least 50 characters.")
SECRET_KEY = SECRET_KEY or secrets.token_urlsafe(64)
ALLOWED_HOSTS = [
    host.strip() for host in os.environ.get("DJANGO_ALLOWED_HOSTS", "").split(",")
    if host.strip()
]
if PRODUCTION and (not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS):
    raise ImproperlyConfigured("Production requires explicit DJANGO_ALLOWED_HOSTS.")
if not PRODUCTION:
    ALLOWED_HOSTS += ["localhost", "127.0.0.1", "[::1]", "testserver"]
    ALLOWED_HOSTS += [
        host for host in os.environ.get("REPLIT_DOMAINS", "").split(",") if host
    ]
    if os.environ.get("REPLIT_DEV_DOMAIN"):
        ALLOWED_HOSTS.append(os.environ["REPLIT_DEV_DOMAIN"])

DATABASE_CONFIGURED = bool(os.environ.get("DATABASE_URL"))
if PRODUCTION and not DATABASE_CONFIGURED:
    raise ImproperlyConfigured("Production requires DATABASE_URL.")
try:
    database = (
        dj_database_url.parse(os.environ["DATABASE_URL"], conn_max_age=0)
        if DATABASE_CONFIGURED
        else {"ENGINE": "django.db.backends.postgresql", "NAME": ""}
    )
except ValueError:
    raise ImproperlyConfigured("DATABASE_URL must be a valid PostgreSQL URL.") from None
if database["ENGINE"] != "django.db.backends.postgresql":
    raise ImproperlyConfigured("Only PostgreSQL is supported.")
database.setdefault("OPTIONS", {}).update(
    connect_timeout=3,
    options="-c statement_timeout=3000 -c default_transaction_read_only=on",
)
# Phase 1 never writes. Remove read-only connection mode only with approved migrations.
if PRODUCTION and database["OPTIONS"].get("sslmode") not in {"verify-full", "verify-ca"}:
    raise ImproperlyConfigured("Production DATABASE_URL requires verified TLS (sslmode).")
DATABASES = {"default": database}

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
INSTALLED_APPS = ["rest_framework"]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
}
USE_TZ = True
TIME_ZONE = "UTC"
APPEND_SLASH = False
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_SSL_REDIRECT = PRODUCTION
SECURE_HSTS_SECONDS = 31536000 if PRODUCTION else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = PRODUCTION
SECURE_HSTS_PRELOAD = False
# Enable only behind a proxy that strips untrusted forwarded protocol headers.
if os.environ.get("DJANGO_TRUST_PROXY") == "1":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
