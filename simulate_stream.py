import requests
import time


API_URL = "http://localhost:8000/ingest"


posts = [
    {
        "platform": "x",
        "id": "stream-001",
        "author": "city_watch",
        "text": "Heavy flooding reported near downtown. Several roads are blocked.",
        "timestamp": "2026-08-30T15:00:00"
    },
    {
        "platform": "reddit",
        "post_id": "stream-002",
        "author": "local_user",
        "text": "People are reporting an earthquake and asking others to stay away from damaged buildings.",
        "timestamp": "2026-08-30T15:01:00"
    },
    {
        "platform": "youtube",
        "comment_id": "stream-003",
        "author": "viewer123",
        "comment": "Everything looks normal here. Nothing unusual happening.",
        "timestamp": "2026-08-30T15:02:00"
    },
    {
        "platform": "instagram",
        "media_id": "stream-004",
        "author": "news_update",
        "caption": "Emergency responders are arriving after the explosion.",
        "timestamp": "2026-08-30T15:03:00"
    },
    {
        "platform": "x",
        "id": "stream-005",
        "author": "weather_alert",
        "text": "Severe storm approaching. Residents should evacuate immediately.",
        "timestamp": "2026-08-30T15:04:00"
    }
]


for post in posts:

    try:
        response = requests.post(
            API_URL,
            json=post,
            timeout=10
        )

        print(
            f"{post['platform']:10} "
            f"{post.get('id', post.get('post_id', post.get('comment_id', post.get('media_id'))))} "
            f"→ {response.status_code}"
        )

        if response.ok:
            print("   Stored successfully.")

        else:
            print(
                "   Error:",
                response.text
            )

    except requests.RequestException as error:
        print(
            "   Connection error:",
            error
        )

    time.sleep(2)