"""OFFLINE ONLY: model checks, migration generation, database-free unit tests.

No application settings import, DATABASE_URL access, usable database engine,
or session activation. This is NOT a runtime fallback or a server profile.
"""
from .session_policy import *

SECRET_KEY = "offline-schema-check-only-not-a-runtime-credential"
DATABASES = {"default": {"ENGINE": "django.db.backends.dummy", "NAME": ""}}
DATABASE_CONFIGURED = False
ROOT_URLCONF = "config.urls"
USE_TZ = True
TIME_ZONE = "UTC"
DEBUG = False
ALLOWED_HOSTS = ["testserver"]
