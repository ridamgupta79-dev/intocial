from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from src.database.database import SessionLocal
from src.database.models import User
from src.services.auth_service import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

security = HTTPBearer()


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token.",
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token.",
        )

    db = SessionLocal()

    try:
        user = db.query(User).filter(
            User.id == int(user_id)
        ).first()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=401,
                detail="User is inactive or does not exist.",
            )

        return {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
        }
    finally:
        db.close()


@router.post("/register")
def register(request: RegisterRequest):
    db = SessionLocal()

    try:
        username = request.username.strip()
        email = request.email.strip().lower()

        existing_user = db.query(User).filter(
            (User.username == username)
            | (User.email == email)
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="Username or email already registered.",
            )

        user = User(
            username=username,
            email=email,
            hashed_password=hash_password(request.password),
            role="ANALYST",
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return {
            "message": "User registered successfully.",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
            },
        }
    finally:
        db.close()


@router.post("/login")
def login(request: LoginRequest):
    db = SessionLocal()

    try:
        email = request.email.strip().lower()

        user = db.query(User).filter(
            User.email == email
        ).first()

        if not user or not verify_password(
            request.password,
            user.hashed_password,
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=403,
                detail="User account is inactive.",
            )

        token = create_access_token(
            user_id=user.id,
            username=user.username,
            role=user.role,
        )

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
            },
        }
    finally:
        db.close()


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return current_user