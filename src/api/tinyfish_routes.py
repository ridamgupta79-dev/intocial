
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from src.services.tinyfish_service import (
    TinyFishError,
    investigate_claim,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/tinyfish",
    tags=["TinyFish Live Investigation"],
)


class InvestigationRequest(BaseModel):
    claim: str = Field(min_length=3, max_length=500)
    limit: int = Field(default=5, ge=1, le=5)


@router.post("/investigate")
def investigate(request: InvestigationRequest):
    try:
        return investigate_claim(
            claim=request.claim,
            limit=request.limit,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except TinyFishError:
        logger.exception("TinyFish investigation failed")
        raise HTTPException(
            status_code=502,
            detail="Live web investigation is temporarily unavailable.",
        )
