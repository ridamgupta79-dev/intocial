import os

from dotenv import load_dotenv


load_dotenv()


X_API_KEY = os.getenv("X_API_KEY")
X_API_SECRET = os.getenv("X_API_SECRET")
X_ACCESS_TOKEN = os.getenv("X_ACCESS_TOKEN")
X_ACCESS_TOKEN_SECRET = os.getenv("X_ACCESS_TOKEN_SECRET")

REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET")
REDDIT_USER_AGENT = os.getenv("REDDIT_USER_AGENT")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

INSTAGRAM_ACCESS_TOKEN = os.getenv(
    "INSTAGRAM_ACCESS_TOKEN"
)

DATABASE_URL = os.getenv("DATABASE_URL")