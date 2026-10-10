import logging

from django.conf import settings
from django.db import DatabaseError, connection
from django.views.decorators.cache import never_cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)


@never_cache
@api_view(["GET"])
@permission_classes([AllowAny])
def liveness(request):
    """Process health only: this endpoint never accesses PostgreSQL."""
    return Response({"status": "ok"})


@never_cache
@api_view(["GET"])
@permission_classes([AllowAny])
def readiness(request):
    """Connectivity only, not schema readiness or a production-readiness claim."""
    unavailable = {"status": "unavailable", "database": "unavailable"}
    if not settings.DATABASE_CONFIGURED:
        return Response(unavailable, status=503)
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            if cursor.fetchone() != (1,):
                return Response(unavailable, status=503)
    except DatabaseError:
        # Do not log exception text: drivers may include hosts or credentials.
        logger.warning("PostgreSQL readiness check failed")
        return Response(unavailable, status=503)
    return Response({"status": "ready", "database": "connected"})
