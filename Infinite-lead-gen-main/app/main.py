from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .browser import BrowserAutomationError, run_google_maps_search
from .graph import build_graph
from .schemas import ChatRequest, ChatResponse, MapsScrapeRequest, MapsScrapeResponse

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Web Bie", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
async def startup_event() -> None:
    app.state.graph = build_graph()


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.post("/api/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    graph = app.state.graph
    result = await graph.ainvoke({"user_message": payload.message})

    parsed = {
        "task_type": result.get("task_type"),
        "url": result.get("url"),
        "input_text": result.get("input_text"),
        "input_selector": result.get("input_selector"),
        "output_selector": result.get("output_selector"),
        "maps_query": result.get("maps_query"),
        "maps_location": result.get("maps_location"),
        "result_limit": result.get("result_limit"),
        "parser_used": result.get("parser_used"),
        "parser_error": result.get("parser_error"),
        "error": result.get("error"),
    }

    return ChatResponse(
        reply=result.get("assistant_reply", "No response generated."),
        parsed=parsed,
        data=result.get("structured_data"),
    )


@app.post("/api/maps-scrape", response_model=MapsScrapeResponse)
async def maps_scrape(payload: MapsScrapeRequest) -> MapsScrapeResponse:
    try:
        result = await run_google_maps_search(
            query=payload.what_to_scrape,
            location=payload.location,
            max_results=payload.result_limit,
        )
        return MapsScrapeResponse(
            reply=f"Collected {result.get('count', 0)} places for '{payload.what_to_scrape}' in '{payload.location}'.",
            data=result,
        )
    except BrowserAutomationError as exc:
        return MapsScrapeResponse(
            reply=f"Maps scraping failed: {exc}",
            data={
                "task": "maps_search",
                "query": payload.what_to_scrape,
                "location": payload.location,
                "count": 0,
                "results": [],
                "error": str(exc),
            },
        )
