from typing import Any

from sqlalchemy import func, select

from src.database.database import SessionLocal
from src.database.models import Signal


def _signal_to_dict(
    signal: Signal
) -> dict[str, Any]:
    return {
        "text": signal.text,
        "platform": signal.platform,
        "timestamp": (
            signal.timestamp.isoformat()
            if signal.timestamp
            else None
        ),
        "author": signal.author,
        "post_id": signal.post_id,
        "url": signal.url,
        "risk_score": signal.risk_score,
        "risk_level": signal.risk_level,
        "prediction": signal.prediction,
        "confidence": signal.confidence,
        "severity_terms": (
            signal.severity_terms or []
        ),
        "urgency_terms": (
            signal.urgency_terms or []
        ),
        "entities": (
            signal.entities or []
        ),
        "locations": (
            signal.locations or []
        ),
        "organizations": (
            signal.organizations or []
        ),
        "people": (
            signal.people or []
        ),
        "quantities": (
            signal.quantities or []
        ),
        "risk_entities": (
            signal.risk_entities or []
        ),
        "entity_risk_bonus": (
            signal.entity_risk_bonus or 0
        ),
        "context": (
            signal.context or {}
        ),
        "explanation": (
            signal.explanation or {}
        ),
    }


def count_live_signals(
    risk_level: str | None = None,
    platform: str | None = None,
) -> int:
    with SessionLocal() as db:

        statement = select(
            func.count(Signal.id)
        )

        if risk_level:
            statement = statement.where(
                Signal.risk_level == risk_level
            )

        if platform:
            statement = statement.where(
                Signal.platform == platform
            )

        return db.execute(
            statement
        ).scalar_one()


def get_live_signal_counts(
    platform: str | None = None,
) -> dict[str, int]:
    with SessionLocal() as db:

        statement = select(
            Signal.risk_level,
            func.count(Signal.id),
        )

        if platform:
            statement = statement.where(
                Signal.platform == platform
            )

        statement = statement.group_by(
            Signal.risk_level
        )

        rows = db.execute(
            statement
        ).all()

        counts = {
            "LOW": 0,
            "MEDIUM": 0,
            "HIGH": 0,
            "CRITICAL": 0,
        }

        for risk_level, count in rows:
            if risk_level in counts:
                counts[risk_level] = count

        return counts


def load_live_signals(
    limit: int | None = None,
    offset: int = 0,
    risk_level: str | None = None,
    platform: str | None = None,
) -> list[dict[str, Any]]:
    with SessionLocal() as db:

        statement = (
            select(Signal)
            .order_by(
                Signal.timestamp.desc()
            )
        )

        if risk_level:
            statement = statement.where(
                Signal.risk_level == risk_level
            )

        if platform:
            statement = statement.where(
                Signal.platform == platform
            )

        if offset > 0:
            statement = statement.offset(
                offset
            )

        if limit is not None:
            statement = statement.limit(
                limit
            )

        result = db.execute(
            statement
        )

        signals = result.scalars().all()

        return [
            _signal_to_dict(signal)
            for signal in signals
        ]


def save_live_signal(
    signal: dict[str, Any],
) -> tuple[dict[str, Any], bool]:

    with SessionLocal() as db:

        post_id = signal.get(
            "post_id"
        )

        platform = signal.get(
            "platform"
        )

        if post_id is not None:

            statement = select(
                Signal
            ).where(
                Signal.post_id == post_id,
                Signal.platform == platform,
            )

            existing = (
                db.execute(statement)
                .scalars()
                .first()
            )

            if existing is not None:
                return (
                    _signal_to_dict(existing),
                    False,
                )

        new_signal = Signal(
            text=signal.get(
                "text",
                "",
            ),
            platform=platform,
            timestamp=signal.get(
                "timestamp"
            ),
            author=signal.get(
                "author"
            ),
            post_id=post_id,
            url=signal.get(
                "url"
            ),
            risk_score=signal.get(
                "risk_score"
            ),
            risk_level=signal.get(
                "risk_level"
            ),
            prediction=signal.get(
                "prediction"
            ),
            confidence=signal.get(
                "confidence"
            ),
            severity_terms=signal.get(
                "severity_terms",
                [],
            ),
            urgency_terms=signal.get(
                "urgency_terms",
                [],
            ),
            entities=signal.get(
                "entities",
                [],
            ),
            locations=signal.get(
                "locations",
                [],
            ),
            organizations=signal.get(
                "organizations",
                [],
            ),
            people=signal.get(
                "people",
                [],
            ),
            quantities=signal.get(
                "quantities",
                [],
            ),
            risk_entities=signal.get(
                "risk_entities",
                [],
            ),
            entity_risk_bonus=signal.get(
                "entity_risk_bonus",
                0,
            ),
            context=signal.get(
                "context",
                {},
            ),
            explanation=signal.get(
                "explanation",
                {},
            ),
        )

        db.add(new_signal)
        db.commit()
        db.refresh(new_signal)

        return (
            _signal_to_dict(new_signal),
            True,
        )