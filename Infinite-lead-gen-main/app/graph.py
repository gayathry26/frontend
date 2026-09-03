import json
import re
from typing import Literal, TypedDict
from urllib.parse import parse_qs, quote_plus, urlparse

from langgraph.graph import END, StateGraph

from .browser import BrowserAutomationError, run_browser_task, run_google_maps_search
from .ollama_parser import parse_command_with_ollama


class ChatState(TypedDict, total=False):
    user_message: str
    task_type: str | None
    url: str
    input_text: str | None
    input_selector: str | None
    output_selector: str | None
    maps_query: str | None
    maps_location: str | None
    result_limit: int | None
    parser_used: str | None
    parser_error: str | None
    browser_result: str | None
    structured_data: dict | None
    error: str | None
    assistant_reply: str


_URL_RE = re.compile(r"https?://[^\s]+", re.IGNORECASE)


def _parse_message(message: str) -> dict:
    text = " ".join(message.strip().split())
    text = text.replace('\\"', '"').replace("\\'", "'")
    maps_fallback = _parse_maps_intent(text)
    if maps_fallback:
        return maps_fallback

    url_match = _URL_RE.search(text)
    if not url_match:
        return {
            "error": (
                "I could not find a URL. You can either include one, or use map-search style input like: "
                "coaching class - location: coimbatore"
            )
        }

    url = url_match.group(0).rstrip(".,)")

    quoted_input = re.search(r"(?:type|enter|input|search|write)\s+\"([^\"]+)\"", text, re.IGNORECASE)
    if not quoted_input:
        quoted_input = re.search(r"(?:type|enter|input|search|write)\s+'([^']+)'", text, re.IGNORECASE)

    plain_input = re.search(
        r"(?:type|enter|input|search|write)\s+([^\"']+?)(?:\s+(?:in|into)\s+|\s+(?:and|then)\s+|$)",
        text,
        re.IGNORECASE,
    )

    input_text = None
    if quoted_input:
        input_text = quoted_input.group(1).strip()
    elif plain_input:
        input_text = plain_input.group(1).strip()

    input_selector_match = (
        re.search(r"(?:in|into)\s+`([^`]+)`", text, re.IGNORECASE)
        or re.search(r'(?:in|into)\s+"([^"]+)"', text, re.IGNORECASE)
        or re.search(r"(?:in|into)\s+'([^']+)'", text, re.IGNORECASE)
        or re.search(
            r"(?:in|into)\s+(.+?)(?:\s+(?:and|then|extract|read|get|output)\b|$)",
            text,
            re.IGNORECASE,
        )
    )
    output_selector_match = (
        re.search(r"(?:extract|read|get|output)(?:\s+text)?(?:\s+from)?\s+`([^`]+)`", text, re.IGNORECASE)
        or re.search(r'(?:extract|read|get|output)(?:\s+text)?(?:\s+from)?\s+"([^"]+)"', text, re.IGNORECASE)
        or re.search(r"(?:extract|read|get|output)(?:\s+text)?(?:\s+from)?\s+'([^']+)'", text, re.IGNORECASE)
        or re.search(
            r"(?:extract|read|get|output)(?:\s+text)?(?:\s+from)?\s+(.+?)(?:\s+(?:and|then)\b|$)",
            text,
            re.IGNORECASE,
        )
    )

    input_selector = input_selector_match.group(1).strip() if input_selector_match else None
    output_selector = output_selector_match.group(1).strip() if output_selector_match else None

    return {
        "task_type": "browser_task",
        "url": url,
        "input_text": input_text,
        "input_selector": input_selector,
        "output_selector": output_selector,
    }


def _parse_maps_intent(text: str) -> dict | None:
    lower = text.lower()

    location_match = re.search(
        r"^\s*(?P<query>.+?)\s*[-,|]?\s*location\s*[:=-]\s*(?P<location>.+?)\s*$",
        text,
        re.IGNORECASE,
    )

    if not location_match:
        location_match = re.search(
            r"^\s*(?:find|search|show|list)?\s*(?P<query>.+?)\s+in\s+(?P<location>[a-zA-Z .'-]{2,})\s*$",
            text,
            re.IGNORECASE,
        )

    if not location_match:
        return None

    query = location_match.group("query").strip(" -,:")
    location = location_match.group("location").strip(" -,:")
    if not query or not location:
        return None

    limit_match = re.search(r"(?:top|first|max(?:imum)?|limit)\s*(\d{1,2})", lower)
    limit = int(limit_match.group(1)) if limit_match else 10
    limit = max(1, min(limit, 20))
    maps_url = f"https://www.google.com/maps/search/?api=1&query={quote_plus(f'{query} {location}')}"

    return {
        "task_type": "maps_search",
        "maps_query": query,
        "maps_location": location,
        "result_limit": limit,
        "url": maps_url,
        "input_text": None,
        "input_selector": None,
        "output_selector": None,
    }


async def parse_command_node_async(state: ChatState) -> ChatState:
    llm_parsed, llm_status = await parse_command_with_ollama(state["user_message"])
    if llm_parsed:
        llm_parsed["task_type"] = _infer_task_type(state["user_message"], llm_parsed.get("url"))
        if llm_parsed["task_type"] == "maps_search":
            llm_parsed = _enrich_maps_state(llm_parsed, state["user_message"])
        llm_parsed["parser_used"] = llm_status
        return llm_parsed

    parsed = _parse_message(state["user_message"])
    if "error" in parsed:
        return {
            "error": parsed["error"],
            "parser_used": "rule-based",
            "parser_error": llm_status,
        }

    parsed["parser_used"] = "rule-based"
    parsed["parser_error"] = llm_status
    return parsed


async def browse_node(state: ChatState) -> ChatState:
    try:
        if state.get("task_type") == "maps_search":
            maps_payload = await run_google_maps_search(
                query=state.get("maps_query") or "",
                location=state.get("maps_location") or "",
                max_results=state.get("result_limit") or 10,
            )
            return {
                "structured_data": maps_payload,
                "browser_result": json.dumps(maps_payload, indent=2),
            }

        result = await run_browser_task(
            url=state["url"],
            input_text=state.get("input_text"),
            input_selector=state.get("input_selector"),
            output_selector=state.get("output_selector"),
        )
        return {"browser_result": result}
    except BrowserAutomationError as exc:
        return {"error": str(exc)}
    except Exception as exc:
        return {"error": f"Unexpected browser error: {exc}"}


def format_response_node(state: ChatState) -> ChatState:
    if state.get("error"):
        return {"assistant_reply": f"Request failed: {state['error']}"}

    if state.get("task_type") == "maps_search":
        data = state.get("structured_data") or {}
        return {"assistant_reply": json.dumps(data, indent=2, ensure_ascii=False)}

    summary = [f"Visited: {state.get('url', '-')}"]
    if state.get("parser_used"):
        summary.append(f"Parser: {state['parser_used']}")
    if state.get("parser_error"):
        summary.append(f"Parser note: {state['parser_error']}")
    if state.get("input_text"):
        summary.append(f"Typed: {state['input_text']}")
    if state.get("input_selector"):
        summary.append(f"Input selector: {state['input_selector']}")
    if state.get("output_selector"):
        summary.append(f"Output selector: {state['output_selector']}")

    summary.append("Result:")
    summary.append(state.get("browser_result", "(No result text returned)"))
    return {"assistant_reply": "\n".join(summary)}


def route_after_parse(state: ChatState) -> Literal["ok", "error"]:
    return "error" if state.get("error") else "ok"


def build_graph():
    builder = StateGraph(ChatState)
    builder.add_node("parse", parse_command_node_async)
    builder.add_node("browse", browse_node)
    builder.add_node("format", format_response_node)

    builder.set_entry_point("parse")
    builder.add_conditional_edges("parse", route_after_parse, {"ok": "browse", "error": "format"})
    builder.add_edge("browse", "format")
    builder.add_edge("format", END)

    return builder.compile()


def _infer_task_type(message: str, url: str | None) -> str:
    lower = message.lower()
    if "location" in lower:
        return "maps_search"
    if "google maps" in lower:
        return "maps_search"
    if url and "google.com/maps" in url:
        return "maps_search"
    return "browser_task"


def _enrich_maps_state(parsed: dict, message: str) -> dict:
    text = " ".join(message.strip().split())
    maps_parts = _parse_maps_intent(text)
    if maps_parts:
        parsed["maps_query"] = maps_parts.get("maps_query")
        parsed["maps_location"] = maps_parts.get("maps_location")
        parsed["result_limit"] = maps_parts.get("result_limit")
        parsed["url"] = maps_parts.get("url", parsed.get("url"))
        return parsed

    url_value = parsed.get("url") or ""
    if "google.com/maps" in url_value:
        query_param = parse_qs(urlparse(url_value).query).get("query", [None])[0]
        if query_param:
            parsed["maps_query"] = parsed.get("maps_query") or query_param
            parsed["maps_location"] = parsed.get("maps_location") or ""
            parsed["result_limit"] = parsed.get("result_limit") or 10
            return parsed

    # Best-effort fallback if LLM recognized maps intent but didn't split fields.
    parsed["maps_query"] = parsed.get("maps_query") or "business"
    parsed["maps_location"] = parsed.get("maps_location") or "india"
    parsed["result_limit"] = parsed.get("result_limit") or 10
    return parsed
