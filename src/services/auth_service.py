from datetime import datetime, timedelta, timezone
import os

from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext


load_dotenv()


SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-secret-key",
)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


def create_access_token(
    user_id: int,
    username: str,
    role: str,
) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "exp": expires,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str):
    try:
        return jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        return None