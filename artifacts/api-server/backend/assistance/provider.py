"""Server-only, bounded OpenAI adapter; no tools, writes, retries or fake fallback."""
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from rest_framework.exceptions import APIException


class Unavailable(APIException):
    status_code = 503
    default_code = "ai_unavailable"


class ProviderError(APIException):
    status_code = 502
    default_code = "ai_provider_error"


class InvalidOutput(APIException):
    status_code = 502
    default_code = "ai_invalid_output"


def status():
    configured = bool(os.environ.get("YIELDLOOP_AI_API_KEY"))
    return {"available": configured, "provider": "openai",
            "model": os.environ.get("YIELDLOOP_AI_MODEL", "gpt-5-mini") if configured else None}


def complete(instruction, data):
    key = os.environ.get("YIELDLOOP_AI_API_KEY")
    if not key:
        raise Unavailable()
    payload = json.dumps({
        "model": status()["model"], "max_completion_tokens": 6000,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "system", "content": instruction},
                     {"role": "user", "content": json.dumps(data, ensure_ascii=False)}],
    }).encode()
    request = Request("https://api.openai.com/v1/chat/completions", data=payload,
                      headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    try:
        with urlopen(request, timeout=35) as response:
            raw = response.read(131073)
        if len(raw) > 131072:
            raise InvalidOutput()
        envelope = json.loads(raw)
        choice = envelope["choices"][0]
        if choice.get("finish_reason") != "stop":
            raise InvalidOutput()
        output = json.loads(choice["message"]["content"])
        if not isinstance(output, dict):
            raise InvalidOutput()
        return output
    except (HTTPError, URLError, TimeoutError, OSError):
        raise ProviderError() from None
    except (ValueError, KeyError, IndexError, TypeError, AttributeError, RecursionError):
        raise InvalidOutput() from None
