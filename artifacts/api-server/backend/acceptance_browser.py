"""Loopback-only browser harness. Never imports application/deployment settings.

Run AFTER the PostgreSQL test suite. Serves the built SPA and test API together.
Credentials are ephemeral, private, and never printed. Ctrl-C stops the server.
"""
import json
import mimetypes
import os
import secrets
import tempfile
from pathlib import Path
from wsgiref.simple_server import make_server

os.environ["DJANGO_SETTINGS_MODULE"] = "config.test_settings"

import django

django.setup()

from accounts.models import User
from django.conf import settings
from django.core.wsgi import get_wsgi_application
from django.db import connection


def main():
    assert settings.TESTING and settings.ENVIRONMENT == "development"
    assert not os.environ.get("REPLIT_DEPLOYMENT")
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database(), system_identifier::text FROM pg_control_system()")
        name, cluster = cursor.fetchone()
    assert name == "test_yieldloop_phase2b" and cluster == os.environ["YIELDLOOP_DEV_CLUSTER"]
    assert not User.objects.exists(), "Run the isolated test suite first; never overwrite existing test fixtures."
    root = Path(__file__).resolve().parents[2] / "yieldloop/dist/public"
    assert (root / "index.html").is_file(), "Build the frontend first."
    credentials = {}
    for role in User.Role.values:
        username = f"acceptance_{role}_{secrets.token_hex(4)}"
        password = secrets.token_urlsafe(32)
        user = User.objects.create_user(username=username, password=password, role=role)
        credentials[role] = {"username": username, "password": password, "id": user.pk}
    fd, private_path = tempfile.mkstemp(prefix="yieldloop-acceptance-", suffix=".json")
    with os.fdopen(fd, "w") as stream:
        json.dump(credentials, stream)
    api = get_wsgi_application()

    def app(environ, start_response):
        url = environ.get("PATH_INFO", "/")
        if url.startswith("/api/"):
            return api(environ, start_response)
        path = (root / url.lstrip("/")).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            path = root / "index.html"
        body = path.read_bytes()
        start_response("200 OK", [("Content-Type", mimetypes.guess_type(str(path))[0] or "application/octet-stream"),
                                  ("Content-Length", str(len(body))), ("Cache-Control", "no-store")])
        return [body]

    print(f"Isolated browser harness: http://localhost:8099 ; private credentials: {private_path}", flush=True)
    try:
        with make_server("127.0.0.1", 8099, app) as server:
            server.serve_forever()
    finally:
        Path(private_path).unlink(missing_ok=True)


if __name__ == "__main__":
    main()
