# Web Bie

A FastAPI app that uses Lightpanda + Playwright to scrape Google Maps results into JSON.

Main workflow (UI):
- enter **What to scrape** (example: `Bakery`)
- enter **Location** (example: `Coimbatore`)
- click **Scrape Google Maps**
- view and download structured JSON

## Requirements

- Python 3.10+
- A running Lightpanda CDP server (default expected at `ws://127.0.0.1:9223/`)

## Install

```bash
pip install -e .
playwright install chromium
```

## Run

```bash
set LIGHTPANDA_CDP_URL=ws://127.0.0.1:9223/
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Open `http://127.0.0.1:8000`.

## API

### POST `/api/maps-scrape`

Request body:

```json
{
  "what_to_scrape": "Bakery",
  "location": "Coimbatore",
  "result_limit": 30
}
```

Returns JSON with fields such as:
- `name`
- `category`
- `address`
- `phone`
- `website`
- `rating`
- `reviews`
- `open_status`
- `maps_url`
- `latitude` / `longitude`

## Sample Input

- What to scrape: `Bakery`
- Location: `Coimbatore`

## Ollama Cloud Integration

The parser is robust by default:
1. try NVIDIA NIM
2. fall back to Ollama Cloud (if configured)
3. fall back to local Ollama
4. fall back to rule-based parsing

Environment variables:

```bash
# Turn on/off LLM parsing
set WEB_BIE_USE_OLLAMA=true

# auto | nvidia | cloud | local
set OLLAMA_PARSER_MODE=auto

# NVIDIA NIM (recommended primary)
set NVIDIA_NIM_API_KEY=your_nvidia_key_here
set NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
set NVIDIA_NIM_MODEL=meta/llama-3.1-70b-instruct

# Ollama Cloud
set OLLAMA_CLOUD_API_KEY=your_api_key_here
set OLLAMA_CLOUD_BASE_URL=https://api.ollama.com/v1
set OLLAMA_CLOUD_MODEL=llama3.3

# Local Ollama fallback
set OLLAMA_BASE_URL=http://127.0.0.1:11434
set OLLAMA_MODEL=gemma4:e2b
```
