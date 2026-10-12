"""Isolated development Preview; production startup never selects this profile."""
import os

from django.core.exceptions import ImproperlyConfigured

from .session_settings import *

if ENVIRONMENT != "development" or os.environ.get("REPLIT_DEPLOYMENT"):
    raise ImproperlyConfigured("Demo Preview is development-only.")

DEMO_SCHEMA = "yieldloop_preview_demo"
DATABASES["default"]["OPTIONS"] = {
    **DATABASES["default"].get("OPTIONS", {}),
    "options": DATABASES["default"].get("OPTIONS", {}).get("options", "") + f" -c search_path={DEMO_SCHEMA}",
}
