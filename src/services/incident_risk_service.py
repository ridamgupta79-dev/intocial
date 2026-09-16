from typing import Any


def calculate_incident_risk(
    signals: list[dict[str, Any]],
) -> dict[str, Any]:

    if not signals:
        return {
            "risk_score": 0.0,
            "risk_level": "LOW",
            "factors": [],
        }

    risk_scores = [
        float(signal.get("risk_score", 0))
        for signal in signals
    ]

    highest_score = max(risk_scores)

    high_risk_count = sum(
        1
        for signal in signals
        if signal.get("risk_level")
        in {"HIGH", "CRITICAL"}
    )

    critical_count = sum(
        1
        for signal in signals
        if signal.get("risk_level") == "CRITICAL"
    )

    platforms = {
        signal.get("platform")
        for signal in signals
        if signal.get("platform")
    }

    risk_entities = {
        entity.lower()
        for signal in signals
        for entity in (
            signal.get("risk_entities") or []
        )
        if entity
    }

    score = highest_score

    if len(signals) >= 3:
        score += 5

    if len(signals) >= 5:
        score += 5

    if high_risk_count >= 2:
        score += 10

    if critical_count >= 1:
        score += 15

    if len(platforms) >= 2:
        score += 5

    if len(risk_entities) >= 2:
        score += 5

    score = min(
        round(score, 2),
        100.0,
    )

    if score >= 75:
        risk_level = "CRITICAL"
    elif score >= 50:
        risk_level = "HIGH"
    elif score >= 25:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    factors = []

    if highest_score > 0:
        factors.append(
            "High individual signal risk"
        )

    if len(signals) >= 3:
        factors.append(
            "Multiple signals detected"
        )

    if high_risk_count >= 2:
        factors.append(
            "Multiple high-risk signals"
        )

    if critical_count >= 1:
        factors.append(
            "Critical signal detected"
        )

    if len(platforms) >= 2:
        factors.append(
            "Cross-platform evidence"
        )

    if len(risk_entities) >= 2:
        factors.append(
            "Multiple risk entities detected"
        )

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "factors": factors,
    }

from src.database.database import SessionLocal
from src.database.models import Incident, Signal


def update_incident_risk(
    incident_id: int,
) -> dict[str, Any] | None:

    with SessionLocal() as db:
        incident = db.get(
            Incident,
            incident_id,
        )

        if incident is None:
            return None

        signals = (
            db.query(Signal)
            .filter(
                Signal.incident_id == incident_id
            )
            .all()
        )

        signal_data = [
            {
                "risk_score": signal.risk_score,
                "risk_level": signal.risk_level,
                "platform": signal.platform,
                "risk_entities": (
                    signal.risk_entities or []
                ),
            }
            for signal in signals
        ]

        result = calculate_incident_risk(
            signal_data
        )

        incident.risk_score = result[
            "risk_score"
        ]

        incident.risk_level = result[
            "risk_level"
        ]

        incident.last_updated = (
            __import__("datetime")
            .datetime.now(
                __import__("datetime").timezone.utc
            )
        )

        db.commit()
        db.refresh(incident)

        return {
            "incident_id": incident.id,
            "incident_key": incident.incident_key,
            "risk_score": incident.risk_score,
            "risk_level": incident.risk_level,
            "factors": result["factors"],
        }