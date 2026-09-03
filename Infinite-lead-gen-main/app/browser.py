import asyncio
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import quote_plus

from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright


class BrowserAutomationError(RuntimeError):
    pass


def _iter_browser_backends() -> list[str]:
    mode = os.getenv("WEB_BIE_BROWSER_MODE", "auto").strip().lower()
    if mode in {"lightpanda", "cdp"}:
        return ["cdp"]
    if mode in {"local", "chromium"}:
        return ["local"]
    return ["cdp", "local"]


async def _launch_browser_for_backend(playwright, backend: str):
    if backend == "cdp":
        cdp_url = os.getenv("LIGHTPANDA_CDP_URL", "ws://127.0.0.1:9223/")
        return await playwright.chromium.connect_over_cdp(cdp_url)
    return await playwright.chromium.launch(headless=True)


async def _new_context(browser, backend: str):
    if backend == "cdp" and browser.contexts:
        return browser.contexts[0]
    return await browser.new_context()


async def _first_visible_selector(page, selectors: list[str]) -> Optional[str]:
    for selector in selectors:
        locator = page.locator(selector).first
        try:
            if await locator.count() and await locator.is_visible():
                return selector
        except Exception:
            continue
    return None


async def run_browser_task(
    *,
    url: str,
    input_text: Optional[str],
    input_selector: Optional[str],
    output_selector: Optional[str],
    timeout_ms: int = 20000,
) -> str:
    backend_errors: list[str] = []

    for backend in _iter_browser_backends():
        async with async_playwright() as playwright:
            browser = None
            page = None
            try:
                browser = await _launch_browser_for_backend(playwright, backend)
                context = await _new_context(browser, backend)
                page = await context.new_page()
                await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)

                used_input_selector = input_selector
                if input_text:
                    if not used_input_selector:
                        used_input_selector = await _first_visible_selector(
                            page,
                            [
                                "textarea",
                                "input[type='text']",
                                "input[type='search']",
                                "input[type='email']",
                                "input[type='url']",
                                "input:not([type])",
                                "[contenteditable='true']",
                            ],
                        )

                    if not used_input_selector:
                        raise BrowserAutomationError(
                            "Could not find a text input on the page. Provide an explicit selector in your message."
                        )

                    target = page.locator(used_input_selector).first
                    await target.fill(input_text, timeout=timeout_ms)
                    await target.press("Enter")
                    await asyncio.sleep(1.2)

                if output_selector:
                    output_locator = page.locator(output_selector).first
                    await output_locator.wait_for(timeout=timeout_ms)
                    result_text = (await output_locator.inner_text()).strip()
                    if not result_text:
                        raise BrowserAutomationError(
                            f"Selector '{output_selector}' was found but had no text content."
                        )
                    return result_text

                title = await page.title()
                body_text = await page.locator("body").inner_text(timeout=timeout_ms)
                preview = " ".join(body_text.split())[:1200]
                return f"Title: {title}\nPreview: {preview}"
            except PlaywrightTimeoutError as exc:
                backend_errors.append(f"{backend}: timeout: {exc}")
            except Exception as exc:
                backend_errors.append(f"{backend}: {exc}")
            finally:
                if page:
                    await page.close()
                if browser:
                    await browser.close()

    raise BrowserAutomationError("All browser backends failed. " + " | ".join(backend_errors))


async def run_google_maps_search(
    *,
    query: str,
    location: str,
    max_results: int = 30,
    timeout_ms: int = 35000,
) -> dict[str, Any]:
    full_query = f"{query} {location}".strip()
    maps_url = f"https://www.google.com/maps/search/?api=1&query={quote_plus(full_query)}"
    max_results = max(1, min(max_results, 100))
    backend_errors: list[str] = []

    for backend in _iter_browser_backends():
        async with async_playwright() as playwright:
            browser = None
            page = None
            try:
                browser = await _launch_browser_for_backend(playwright, backend)
                context = await _new_context(browser, backend)
                page = await context.new_page()
                await page.goto(maps_url, wait_until="domcontentloaded", timeout=timeout_ms)
                await _accept_google_maps_dialogs(page)
                await _wait_for_maps_results(page)
                search_page_url = page.url

                listing_results = await _collect_maps_results(page, limit=max_results)
                if not listing_results:
                    raise BrowserAutomationError(
                        "No map results were found. Try a broader query or a nearby city name."
                    )

                enriched_results = await _enrich_maps_results(
                    page, listing_results, timeout_ms=timeout_ms
                )
                for index, item in enumerate(enriched_results, start=1):
                    item["rank"] = index
                    item["query"] = query
                    item["location"] = location

                return {
                    "task": "maps_search",
                    "query": query,
                    "location": location,
                    "source_url": search_page_url,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "count": len(enriched_results),
                    "results": enriched_results,
                }
            except PlaywrightTimeoutError as exc:
                backend_errors.append(f"{backend}: timeout: {exc}")
            except Exception as exc:
                backend_errors.append(f"{backend}: {exc}")
            finally:
                if page:
                    await page.close()
                if browser:
                    await browser.close()

    raise BrowserAutomationError("All browser backends failed. " + " | ".join(backend_errors))


async def _accept_google_maps_dialogs(page) -> None:
    selectors = [
        "button:has-text('Accept all')",
        "button:has-text('I agree')",
        "button:has-text('Accept')",
    ]
    for selector in selectors:
        try:
            button = page.locator(selector).first
            if await button.count() and await button.is_visible():
                await button.click(timeout=3000)
                await asyncio.sleep(0.8)
                return
        except Exception:
            continue


async def _wait_for_maps_results(page) -> None:
    candidates = [
        "div[role='feed']",
        "a[href*='/maps/place/']",
        "div.Nv2PK",
    ]
    for selector in candidates:
        try:
            await page.locator(selector).first.wait_for(timeout=6000)
            return
        except Exception:
            continue
    await asyncio.sleep(2)


async def _collect_maps_results(page, limit: int) -> list[dict[str, Any]]:
    seen: dict[str, dict[str, Any]] = {}
    stagnant_rounds = 0
    max_rounds = max(10, min(80, limit * 4))

    for _ in range(max_rounds):
        batch = await _extract_maps_results(page, limit=max(50, limit * 3))
        before_count = len(seen)

        for place in batch:
            maps_url = (place.get("maps_url") or "").strip()
            if not maps_url:
                continue
            if maps_url in seen:
                seen[maps_url] = _merge_place_data(seen[maps_url], place)
            else:
                seen[maps_url] = place

        if len(seen) >= limit:
            break

        if len(seen) == before_count:
            stagnant_rounds += 1
        else:
            stagnant_rounds = 0

        if stagnant_rounds >= 7:
            break

        await _scroll_maps_results(page, rounds=1)

    return list(seen.values())[:limit]


async def _scroll_maps_results(page, rounds: int = 1) -> None:
    for _ in range(rounds):
        try:
            feed = page.locator("div[role='feed']").first
            if await feed.count():
                await feed.evaluate("(el) => el.scrollBy(0, el.scrollHeight)")
            else:
                await page.mouse.wheel(0, 2500)
        except Exception:
            pass
        await asyncio.sleep(1.1)


async def _extract_maps_results(page, limit: int = 100) -> list[dict[str, Any]]:
    raw = await page.evaluate(
        """(maxItems) => {
          const anchors = Array.from(document.querySelectorAll('a[href*="/maps/place/"]'));
          const seen = new Set();
          const out = [];

          const normalize = (value) => {
            if (value == null) return null;
            const text = String(value).replace(/\\s+/g, ' ').trim();
            return text || null;
          };

          const firstMatch = (value, regex) => {
            if (!value) return null;
            const match = String(value).match(regex);
            return match ? normalize(match[1]) : null;
          };

          const parsePhone = (value) => firstMatch(value, /(\\+?\\d[\\d\\s().-]{7,}\\d)/);

          const parseAddressFromTokens = (tokens) => {
            for (const token of tokens) {
              if (!token) continue;
              if (/(^\\d+[\\w\\s,.-]+)|(\\broad\\b|\\bstreet\\b|\\bave\\b|\\bavenue\\b|\\blane\\b|\\bnear\\b|\\bnagar\\b|\\bcity\\b|\\bpin\\b)/i.test(token)) {
                return normalize(token);
              }
            }
            return null;
          };

          for (const anchor of anchors) {
            const href = anchor.href ? new URL(anchor.href, location.origin).toString() : '';
            if (!href || seen.has(href)) continue;
            seen.add(href);

            const card = anchor.closest('div[role="article"], div.Nv2PK');
            const cardText = normalize(card?.innerText || anchor.innerText || '');
            const lines = (cardText || '').split('\\n').map((line) => normalize(line)).filter(Boolean);

            const name =
              normalize(anchor.getAttribute('aria-label')) ||
              normalize(anchor.textContent) ||
              normalize(lines[0]);

            let category = null;
            let address = null;
            let phone = parsePhone(cardText);
            let rating = null;
            let reviews = null;

            const starNode = card?.querySelector('span[role="img"][aria-label*="star"]');
            if (starNode) {
              const aria = starNode.getAttribute('aria-label') || '';
              rating = firstMatch(aria, /([0-5](?:\\.[0-9])?)/);
              reviews = firstMatch(aria, /([\\d,]+)\\s+review/i);
            }

            if (!rating || !reviews) {
              for (const line of lines) {
                if (!rating) {
                  const maybeRating = firstMatch(line, /([0-5](?:\\.[0-9])?)/);
                  if (maybeRating && Number(maybeRating) <= 5) rating = maybeRating;
                }
                if (!reviews) {
                  reviews = firstMatch(line, /\\(([\\d,]+)\\)/) || firstMatch(line, /([\\d,]+)\\s+review/i);
                }
              }
            }

            const dotLine = lines.find((line) => line.includes('·'));
            if (dotLine) {
              const parts = dotLine.split('·').map((item) => normalize(item)).filter(Boolean);
              if (parts.length) category = parts[0];
              if (!address) address = parseAddressFromTokens(parts.slice(1));
              if (!phone) {
                for (const part of parts) {
                  const maybePhone = parsePhone(part);
                  if (maybePhone) {
                    phone = maybePhone;
                    break;
                  }
                }
              }
            }

            if (!address) address = parseAddressFromTokens(lines.slice(1));

            out.push({
              name: name || null,
              maps_url: href,
              category: category || null,
              address: address || null,
              phone: phone || null,
              rating: rating || null,
              reviews: reviews || null,
              snippet: cardText || null
            });

            if (out.length >= maxItems) break;
          }

          return out;
        }""",
        limit,
    )

    if isinstance(raw, list):
        try:
            return json.loads(json.dumps(raw))
        except Exception:
            return []
    return []


async def _enrich_maps_results(
    page,
    results: list[dict[str, Any]],
    *,
    timeout_ms: int,
) -> list[dict[str, Any]]:
    enriched: list[dict[str, Any]] = []

    for index, place in enumerate(results, start=1):
        maps_url = place.get("maps_url")
        base = dict(place)
        if not maps_url:
            base["rank"] = index
            enriched.append(base)
            continue

        try:
            await page.goto(maps_url, wait_until="domcontentloaded", timeout=timeout_ms)
            await asyncio.sleep(1.4)
            details = await _extract_place_details(page)
            merged = _merge_place_data(base, details)
            lat, lng = _extract_coordinates_from_maps_url(page.url or maps_url)
            if lat is not None and merged.get("latitude") is None:
                merged["latitude"] = lat
            if lng is not None and merged.get("longitude") is None:
                merged["longitude"] = lng
            merged["maps_url"] = page.url or maps_url
            merged["place_id"] = merged.get("place_id") or _extract_place_id_from_maps_url(
                page.url or maps_url
            )
            merged["rank"] = index
            enriched.append(merged)
        except Exception:
            base["rank"] = index
            base["place_id"] = base.get("place_id") or _extract_place_id_from_maps_url(maps_url)
            lat, lng = _extract_coordinates_from_maps_url(maps_url)
            if lat is not None and base.get("latitude") is None:
                base["latitude"] = lat
            if lng is not None and base.get("longitude") is None:
                base["longitude"] = lng
            enriched.append(base)

    return enriched


async def _extract_place_details(page) -> dict[str, Any]:
    raw = await page.evaluate(
        """() => {
          const normalize = (value) => {
            if (value == null) return null;
            const text = String(value).replace(/\\s+/g, ' ').trim();
            return text || null;
          };

          const textFromNode = (node) => normalize(node?.innerText || node?.textContent || null);

          const findBySelectors = (selectors) => {
            for (const selector of selectors) {
              const node = document.querySelector(selector);
              const value = textFromNode(node);
              if (value) return value;
            }
            return null;
          };

          const parseAfterPrefix = (value, prefix) => {
            if (!value) return null;
            const text = String(value).trim();
            if (!text.startsWith(prefix)) return null;
            return normalize(text.slice(prefix.length).trim());
          };

          const firstMatch = (value, regex) => {
            if (!value) return null;
            const match = String(value).match(regex);
            return match ? normalize(match[1]) : null;
          };

          const phoneFromAria = (() => {
            const phoneButton = document.querySelector("button[aria-label^='Phone:']");
            return parseAfterPrefix(phoneButton?.getAttribute('aria-label'), 'Phone:');
          })();

          const addressFromAria = (() => {
            const addressButton = document.querySelector("button[aria-label^='Address:']");
            return parseAfterPrefix(addressButton?.getAttribute('aria-label'), 'Address:');
          })();

          const plusCodeFromAria = (() => {
            const plusCodeButton = document.querySelector("button[aria-label^='Plus code:']");
            return parseAfterPrefix(plusCodeButton?.getAttribute('aria-label'), 'Plus code:');
          })();

          const websiteNode =
            document.querySelector("a[data-item-id='authority']") ||
            document.querySelector("a[aria-label*='Website']");

          const ratingAria =
            document.querySelector("div.F7nice span[role='img']")?.getAttribute('aria-label') ||
            document.querySelector("span[role='img'][aria-label*='star']")?.getAttribute('aria-label') ||
            '';

          return {
            name: findBySelectors(['h1.DUwDvf', "h1[class*='fontHeadlineLarge']", 'h1']),
            category: findBySelectors([
              "button[jsaction*='pane.rating.category']",
              "span.DkEaL",
              "div[role='main'] button[jsaction*='category']"
            ]),
            address:
              findBySelectors([
                "button[data-item-id='address'] .Io6YTe",
                "button[data-item-id='address']",
                "div[data-item-id='address'] .Io6YTe"
              ]) || addressFromAria,
            phone:
              findBySelectors([
                "button[data-item-id^='phone:tel:'] .Io6YTe",
                "button[data-item-id^='phone:tel:']",
                "button[data-tooltip='Copy phone number'] .Io6YTe",
                "button[data-item-id*='phone'] .Io6YTe"
              ]) || phoneFromAria,
            website: normalize(websiteNode?.href || null),
            plus_code:
              findBySelectors([
                "button[data-item-id='oloc'] .Io6YTe",
                "button[data-item-id='oloc']"
              ]) || plusCodeFromAria,
            rating: firstMatch(ratingAria, /([0-5](?:\\.[0-9])?)/),
            reviews:
              firstMatch(ratingAria, /([\\d,]+)\\s+review/i) ||
              findBySelectors(["button[jsaction*='pane.rating.moreReviews'] span"]),
            open_status: findBySelectors([
              "span[class*='ZDu9vd']",
              "div.rogA2c",
              "div[aria-label*='Open']"
            ]),
            raw_text_excerpt: normalize(document.body?.innerText || '')?.slice(0, 1500) || null
          };
        }"""
    )

    if isinstance(raw, dict):
        try:
            return json.loads(json.dumps(raw))
        except Exception:
            return {}
    return {}


def _merge_place_data(base: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in incoming.items():
        if key not in merged or merged[key] in (None, "", [], {}):
            merged[key] = value
    return merged


def _extract_coordinates_from_maps_url(url: str) -> tuple[float | None, float | None]:
    if not url:
        return None, None
    match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", url)
    if not match:
        return None, None
    try:
        return float(match.group(1)), float(match.group(2))
    except ValueError:
        return None, None


def _extract_place_id_from_maps_url(url: str) -> str | None:
    if not url:
        return None
    place_id_match = re.search(r"!1s([A-Za-z0-9:_-]+)!", url)
    if place_id_match:
        return place_id_match.group(1)
    cid_match = re.search(r"[?&]cid=(\d+)", url)
    if cid_match:
        return cid_match.group(1)
    return None
