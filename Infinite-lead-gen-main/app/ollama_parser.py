import json
import os
from typing import Any

import httpx


SYSTEM_PROMPT = """
You convert browser automation requests into JSON for a LangGraph automation agent.
Return only valid JSON with exactly these keys:
- url: string (must include http/https)
- input_text: string or null
- input_selector: string or null
- output_selector: string or null

Rules:
- Use null for unknown values.
- Keep CSS selectors unchanged if user provides them.
- If the user says "extract/read/get/output X", X must go to output_selector.
- If the user says "type/enter/input/search/write Y in/into X", Y is input_text and X is input_selector.
- If user provides a business/category with a location (e.g. "coaching class - location: coimbatore"),
  set url to a Google Maps search URL:
  https://www.google.com/maps/search/?api=1&query=<encoded query and location>
- Do not include markdown or explanations.

Examples:
User: visit https://example.com and extract h1
JSON: {"url":"https://example.com","input_text":null,"input_selector":null,"output_selector":"h1"}

User: visit https://duckduckgo.com and type "lightpanda" in input[name='q'] and extract body
JSON: {"url":"https://duckduckgo.com","input_text":"lightpanda","input_selector":"input[name='q']","output_selector":"body"}
""".strip()


async def parse_command_with_ollama(message: str) -> tuple[dict[str, Any] | None, str | None]:
    mode = os.getenv("OLLAMA_PARSER_MODE", "auto").strip().lower()
    allow_ollama = os.getenv("WEB_BIE_USE_OLLAMA", "true").strip().lower() in {"1", "true", "yes"}
    if not allow_ollama:
        return None, "disabled"

    # Supported modes:
    # - auto (nvidia -> ollama cloud -> local ollama)
    # - nvidia
    # - cloud
    # - local
    errors: list[str] = []

    if mode in {"auto", "nvidia"}:
        parsed, err = await _parse_via_nvidia_nim(message)
        if parsed:
            return parsed, "nvidia-nim"
        if err:
            errors.append(f"nvidia: {err}")

    if mode in {"auto", "cloud"}:
        parsed, err = await _parse_via_ollama_cloud(message)
        if parsed:
            return parsed, "ollama-cloud"
        if err:
            errors.append(f"cloud: {err}")

    if mode in {"auto", "local"}:
        parsed, err = await _parse_via_local_ollama(message)
        if parsed:
            return parsed, "ollama-local"
        if err:
            errors.append(f"local: {err}")

    if mode == "cloud" and not errors:
        errors.append("cloud mode configured but no response from parser")
    if mode == "nvidia" and not errors:
        errors.append("nvidia mode configured but no response from parser")
    if mode == "local" and not errors:
        errors.append("local mode configured but no response from parser")

    return None, "; ".join(errors) if errors else "no parser response"


async def _parse_via_nvidia_nim(message: str) -> tuple[dict[str, Any] | None, str | None]:
    api_key = os.getenv("NVIDIA_NIM_API_KEY") or os.getenv("NVIDIA_API_KEY")
    if not api_key:
        return None, "missing NVIDIA_NIM_API_KEY"

    base_url = os.getenv("NVIDIA_NIM_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/")
    model = os.getenv("NVIDIA_NIM_MODEL", "meta/llama-3.1-70b-instruct")

    payload = {
        "model": model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            resp.raise_for_status()
            body = resp.json()

        content = body["choices"][0]["message"]["content"]
        parsed = _coerce_command(content, message)
        if not parsed:
            return None, "invalid JSON payload from nvidia model"
        return parsed, None
    except Exception as exc:
        return None, str(exc)


async def _parse_via_ollama_cloud(message: str) -> tuple[dict[str, Any] | None, str | None]:
    api_key = os.getenv("OLLAMA_CLOUD_API_KEY") or os.getenv("OLLAMA_API_KEY")
    if not api_key:
        return None, "missing OLLAMA_CLOUD_API_KEY"

    base_url = os.getenv("OLLAMA_CLOUD_BASE_URL", "https://api.ollama.com/v1").rstrip("/")
    model = os.getenv("OLLAMA_CLOUD_MODEL") or os.getenv("OLLAMA_MODEL") or "llama3.3"

    payload = {
        "model": model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            resp.raise_for_status()
            body = resp.json()

        content = body["choices"][0]["message"]["content"]
        parsed = _coerce_command(content, message)
        if not parsed:
            return None, "invalid JSON payload from cloud model"
        return parsed, None
    except Exception as exc:
        return None, str(exc)


async def _parse_via_local_ollama(message: str) -> tuple[dict[str, Any] | None, str | None]:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
    model = os.getenv("OLLAMA_MODEL", "gemma4:e2b")

    payload = {
        "model": model,
        "stream": False,
        "format": "json",
        "options": {"temperature": 0},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=40) as client:
            resp = await client.post(f"{base_url}/api/chat", json=payload)
            resp.raise_for_status()
            body = resp.json()

        content = body.get("message", {}).get("content", "")
        parsed = _coerce_command(content, message)
        if not parsed:
            return None, "invalid JSON payload from local model"
        return parsed, None
    except Exception as exc:
        return None, str(exc)


def _coerce_command(raw: str, source_message: str) -> dict[str, Any] | None:
    try:
        data = json.loads(raw)
    except Exception:
        return None

    if not isinstance(data, dict):
        return None

    normalized = {
        "url": _clean_text(data.get("url")),
        "input_text": _clean_nullable(data.get("input_text")),
        "input_selector": _clean_nullable(data.get("input_selector")),
        "output_selector": _clean_nullable(data.get("output_selector")),
    }

    url = normalized["url"]
    if not url or not str(url).lower().startswith(("http://", "https://")):
        return None

    return _postprocess_by_message(normalized, source_message)


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip().strip('"').strip("'")
    return text or None


def _clean_nullable(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip().strip('"').strip("'")
    if not text or text.lower() in {"null", "none", "n/a", "unknown"}:
        return None
    return text


def _postprocess_by_message(command: dict[str, Any], source_message: str) -> dict[str, Any]:
    text = source_message.lower()
    has_extract_intent = any(k in text for k in ["extract", "read", "get", "output"])
    has_input_intent = any(k in text for k in ["type", "enter", "input", "search", "write"])

    if (
        has_extract_intent
        and not has_input_intent
        and command.get("output_selector") is None
        and command.get("input_selector")
    ):
        command["output_selector"] = command["input_selector"]
        command["input_selector"] = None

    return command
