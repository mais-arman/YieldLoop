"""PENDING activation: never selected by existing startup commands.

Requires approved migrations and write enablement BEFORE authentication flows.
This profile deliberately inherits the current read-only database safeguard.
"""
# ruff: noqa: I001
# Import ordering is intentional: session policy overrides the health profile.
import os

from django.core.exceptions import ImproperlyConfigured

from .settings import *
from .session_policy import *

if len(os.environ.get("DJANGO_SECRET_KEY", "")) < 50:
    raise ImproperlyConfigured("Session activation requires a stable DJANGO_SECRET_KEY.")
