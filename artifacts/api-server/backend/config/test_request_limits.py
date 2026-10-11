"""Security-upgrade regression without database access or large allocations."""
from django.core.exceptions import RequestDataTooBig
from django.test import RequestFactory, SimpleTestCase, override_settings
from rest_framework.parsers import FormParser, JSONParser
from rest_framework.request import Request


class RequestLimitTests(SimpleTestCase):
    @override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=64)
    def test_json_parser_respects_body_limit(self):
        raw = RequestFactory().post("/api/v1/jobs", {"title": "x" * 100}, content_type="application/json")
        request = Request(raw, parsers=[JSONParser()])
        with self.assertRaises(RequestDataTooBig):
            _ = request.data

    @override_settings(DATA_UPLOAD_MAX_MEMORY_SIZE=64)
    def test_form_parser_respects_body_limit(self):
        raw = RequestFactory().post("/api/v1/jobs", "title=" + "x" * 100,
                                    content_type="application/x-www-form-urlencoded")
        request = Request(raw, parsers=[FormParser()])
        with self.assertRaises(RequestDataTooBig):
            _ = request.data
