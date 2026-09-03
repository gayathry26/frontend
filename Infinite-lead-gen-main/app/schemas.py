from typing import Any, Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Natural language automation request")


class ChatResponse(BaseModel):
    reply: str
    parsed: dict
    data: dict | None = None


class ParsedCommand(BaseModel):
    url: str
    input_text: Optional[str] = None
    input_selector: Optional[str] = None
    output_selector: Optional[str] = None


class MapsScrapeRequest(BaseModel):
    what_to_scrape: str = Field(..., min_length=1, description="Business/category to search")
    location: str = Field(..., min_length=1, description="Location/city/area to search in")
    result_limit: int = Field(30, ge=1, le=100, description="Maximum number of places to collect")


class MapsScrapeResponse(BaseModel):
    reply: str
    data: dict[str, Any]
