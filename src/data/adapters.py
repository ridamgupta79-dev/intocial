from typing import Any

from src.data.ingestion import normalize_post


def adapt_post(
    platform: str,
    data: dict[str, Any]
) -> dict[str, Any]:
    """
    Convert a platform-specific record into
    the standard internal post format.
    """

    payload = {
        **data,
        "platform": platform
    }

    return normalize_post(payload)