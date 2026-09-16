from typing import Any


def normalize_post(data: dict[str, Any]) -> dict[str, Any]:
    """
    Convert a social-media record into our standard internal format.
    """

    platform = data.get("platform", "unknown").lower()

    if platform == "x":
        text = data.get("text", "")
        post_id = data.get("id")

    elif platform == "youtube":
        text = data.get("comment", data.get("text", ""))
        post_id = data.get("comment_id", data.get("id"))

    elif platform == "instagram":
        text = data.get("caption", data.get("text", ""))
        post_id = data.get("media_id", data.get("id"))

    else:
        text = data.get("text", "")
        post_id = data.get("post_id", data.get("id"))

    return {
        "text": str(text).strip(),
        "platform": platform,
        "timestamp": data.get("timestamp"),
        "author": data.get("author"),
        "post_id": post_id,
        "url": data.get("url")
    }