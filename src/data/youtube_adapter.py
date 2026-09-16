import requests
from typing import Any

from src.config import YOUTUBE_API_KEY
from src.data.adapters import adapt_post
from src.data.live_storage import save_live_signal
from src.models.risk_service import calculate_risk


YOUTUBE_COMMENTS_URL = (
    "https://www.googleapis.com/youtube/v3/commentThreads"
)


def fetch_youtube_comments(
    video_id: str,
    max_results: int = 20
) -> list[dict]:
    """
    Fetch comments from a YouTube video and convert
    them into the standard internal post format.
    """

    if not YOUTUBE_API_KEY:
        raise RuntimeError(
            "YOUTUBE_API_KEY is not configured."
        )

    response = requests.get(
        YOUTUBE_COMMENTS_URL,
        params={
            "part": "snippet",
            "videoId": video_id,
            "maxResults": max_results,
            "textFormat": "plainText",
            "key": YOUTUBE_API_KEY,
        },
        timeout=15,
    )

    response.raise_for_status()

    data = response.json()

    posts = []

    for item in data.get("items", []):

        snippet = (
            item
            .get("snippet", {})
            .get("topLevelComment", {})
            .get("snippet", {})
        )

        post = adapt_post(
            "youtube",
            {
                "comment_id": item
                .get("id"),

                "comment": snippet
                .get("textDisplay", ""),

                "author": snippet
                .get("authorDisplayName"),

                "timestamp": snippet
                .get("publishedAt"),

                "url": (
                    f"https://www.youtube.com/watch?v={video_id}"
                ),
            }
        )

        if post["text"]:
            posts.append(post)

    return posts

def ingest_youtube_comments(
    video_id: str,
    max_results: int = 20
) -> dict[str, Any]:

    posts = fetch_youtube_comments(
        video_id,
        max_results
    )

    stored_signals = []
    new_count = 0
    duplicate_count = 0

    for post in posts:

        analysis = calculate_risk(
            post["text"]
        )

        signal = {
            **post,
            **analysis
        }

        saved_signal, is_new = save_live_signal(
            signal
        )

        stored_signals.append(
            saved_signal
        )

        if is_new:
            new_count += 1
        else:
            duplicate_count += 1

    return {
        "comments_fetched": len(posts),
        "new_signals": new_count,
        "duplicates_skipped": duplicate_count,
        "signals": stored_signals
    }