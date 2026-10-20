
import os
from typing import Any
from urllib.parse import urlparse

import requests


SEARCH_URL = "https://api.search.tinyfish.ai"
FETCH_URL = "https://api.fetch.tinyfish.ai"

REQUEST_TIMEOUT = 30
MAX_SEARCH_RESULTS = 10
MAX_FETCH_URLS = 5
MAX_PAGE_CHARS = 12000


class TinyFishError(Exception):
    """Raised when a TinyFish request fails."""


def _get_api_key() -> str:
    api_key = os.getenv("TINYFISH_API_KEY", "").strip()

    if not api_key:
        raise TinyFishError(
            "TinyFish is not configured. Set TINYFISH_API_KEY "
            "in the backend environment."
        )

    return api_key


def _headers() -> dict[str, str]:
    return {
        "X-API-Key": _get_api_key(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def search_web(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """Search the live web and return structured search results."""

    query = query.strip()

    if not query:
        raise ValueError("Search query cannot be empty.")

    if len(query) > 500:
        raise ValueError("Search query must be 500 characters or less.")

    limit = max(1, min(limit, MAX_SEARCH_RESULTS))

    try:
        response = requests.get(
            SEARCH_URL,
            params={"query": query},
            headers=_headers(),
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()

    except requests.RequestException as exc:
        raise TinyFishError("TinyFish web search failed.") from exc
    except ValueError as exc:
        raise TinyFishError(
            "TinyFish returned an invalid search response."
        ) from exc

    results = payload.get("results", [])

    if not isinstance(results, list):
        raise TinyFishError("Unexpected TinyFish search response format.")

    cleaned_results = []

    for item in results[:limit]:
        if not isinstance(item, dict):
            continue

        url = item.get("url", "")
        if not isinstance(url, str):
            continue

        parsed = urlparse(url)

        # Only allow normal public HTTP/HTTPS source links.
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            continue

        cleaned_results.append({
            "title": str(item.get("title") or "Untitled source")[:300],
            "url": url,
            "snippet": str(item.get("snippet") or "")[:2000],
            "site_name": str(item.get("site_name") or parsed.netloc)[:200],
            "position": item.get("position"),
        })

    return cleaned_results


def fetch_pages(urls: list[str]) -> dict[str, Any]:
    """Fetch clean page content for selected public web URLs."""

    if not urls:
        return {"results": [], "errors": []}

    if len(urls) > MAX_FETCH_URLS:
        raise ValueError(
            f"You can fetch at most {MAX_FETCH_URLS} URLs per request."
        )

    validated_urls = []

    for url in urls:
        if not isinstance(url, str):
            raise ValueError("Every source URL must be a string.")

        parsed = urlparse(url)

        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
        ):
            raise ValueError("One or more source URLs are invalid.")

        validated_urls.append(url)

    try:
        response = requests.post(
            FETCH_URL,
            headers=_headers(),
            json={
                "urls": validated_urls,
                "format": "markdown",
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()

    except requests.RequestException as exc:
        raise TinyFishError("TinyFish page retrieval failed.") from exc
    except ValueError as exc:
        raise TinyFishError(
            "TinyFish returned an invalid fetch response."
        ) from exc

    results = payload.get("results", [])
    errors = payload.get("errors", [])

    if not isinstance(results, list):
        results = []

    if not isinstance(errors, list):
        errors = []

    # Treat fetched page text as untrusted evidence, not instructions.
    cleaned_pages = []

    for page in results:
        if not isinstance(page, dict):
            continue

        cleaned_pages.append({
            "url": page.get("url"),
            "final_url": page.get("final_url"),
            "title": str(page.get("title") or "Untitled page")[:300],
            "published_date": page.get("published_date"),
            "text": str(page.get("text") or "")[:MAX_PAGE_CHARS],
        })

    return {
        "results": cleaned_pages,
        "errors": errors,
    }


def investigate_claim(
    claim: str,
    limit: int = 5,
) -> dict[str, Any]:
    """Search for public web evidence and fetch selected source pages."""

    claim = claim.strip()

    if not claim:
        raise ValueError("Claim cannot be empty.")

    query = (
        f'"{claim[:300]}" news official statement fact check'
    )

    search_results = search_web(query, limit=limit)

    # Fetch the highest-ranked search results for deeper inspection.
    source_urls = [
        result["url"]
        for result in search_results
        if result.get("url")
    ][:MAX_FETCH_URLS]

    fetched = fetch_pages(source_urls) if source_urls else {
        "results": [],
        "errors": [],
    }

    return {
        "claim": claim,
        "search_results": search_results,
        "fetched_sources": fetched["results"],
        "fetch_errors": fetched["errors"],
        "disclaimer": (
            "Search results are leads, not proof. "
            "Verify source credibility and compare conflicting evidence "
            "before drawing conclusions."
        ),
    }
