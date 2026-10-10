"""Only the explicitly named isolated PostgreSQL test database; never application data."""
from .session_settings import *

TESTING = True
DATABASES = {
    "default": {
        **DATABASES["default"],
        "NAME": "test_yieldloop_phase2b",
        "TEST": {"NAME": "test_yieldloop_phase2b"},
    },
}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
SESSION_COOKIE_SECURE = True
ALLOWED_HOSTS = ["testserver", "localhost"]
