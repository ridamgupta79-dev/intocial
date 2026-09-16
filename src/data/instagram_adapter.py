import json
from pathlib import Path
from typing import Any

from src.data.adapters import adapt_post
from src.data.live_storage import save_live_signal
from src.models.risk_service import calculate_risk


MOCK_DATA_PATH = (
    Path(__file__).parent / "mock_data" / "instagram.json"
)


def fetch_instagram_mock_posts() -> list[dict[str, Any]]:
    with open(MOCK_DATA_PATH, "r", encoding="utf-8") as file:
        data = json.load(file)

    return [
        adapt_post(
            "instagram",
            post,
        )
        for post in data
    ]


def ingest_instagram_mock() -> dict[str, Any]:
    posts = fetch_instagram_mock_posts()

    stored_signals = []
    new_count = 0
    duplicate_count = 0

    for post in posts:
        analysis = calculate_risk(post["text"])

        signal = {
            **post,
            **analysis,
        }

        signal["context"] = {
            **signal.get("context", {}),
            "source_mode": "SIMULATED",
        }

        saved_signal, is_new = save_live_signal(signal)

        stored_signals.append(saved_signal)

        if is_new:
            new_count += 1
        else:
            duplicate_count += 1

    return {
        "platform": "instagram",
        "source_mode": "SIMULATED",
        "posts_fetched": len(posts),
        "new_signals": new_count,
        "duplicates_skipped": duplicate_count,
        "signals": stored_signals,
    }