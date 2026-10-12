from assistance.views import ReadyView
from jobs.serializers import checked
from rest_framework.response import Response

from .panel_kit import kit
from .serializers import SourceInput


class PanelKitView(ReadyView):
    def post(self, request):
        source = checked(SourceInput, request.data)
        return Response({"source": source, "pieces": kit(request.user, source),
                         "unit": "mm", "fold_lines": [], "production_validated": False})
