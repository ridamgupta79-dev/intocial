from datetime import datetime, timezone
from typing import Any

from src.database.database import SessionLocal
from src.database.models import Incident, Signal


def create_incident_from_cluster(
    signal_ids: list[int],
    title: str,
) -> dict[str, Any] | None:

    if not signal_ids:
        return None

    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        signals = (
            db.query(Signal)
            .filter(
                Signal.id.in_(signal_ids)
            )
            .all()
        )

        if not signals:
            return None

        incident = Incident(
            incident_key="TEMP",
            title=title,
            status="ACTIVE",
            risk_score=0,
            risk_level="LOW",
            signal_count=len(signals),
            platforms=sorted(
                {
                    signal.platform
                    for signal in signals
                    if signal.platform
                }
            ),
            locations=sorted(
                {
                    location
                    for signal in signals
                    for location in (
                        signal.locations or []
                    )
                    if location
                }
            ),
            organizations=sorted(
                {
                    organization
                    for signal in signals
                    for organization in (
                        signal.organizations or []
                    )
                    if organization
                }
            ),
            entities=[
                entity
                for signal in signals
                for entity in (
                    signal.entities or []
                )
            ],
            first_detected=min(
                (
                    signal.timestamp
                    for signal in signals
                    if signal.timestamp
                ),
                default=now,
            ),
            last_updated=now,
            created_at=now,
        )

        db.add(incident)
        db.flush()

        incident.incident_key = (
            f"INC-{incident.id:06d}"
        )

        risk_scores = [
            signal.risk_score
            for signal in signals
            if signal.risk_score is not None
        ]

        if risk_scores:
            incident.risk_score = max(
                risk_scores
            )

        risk_levels = {
            signal.risk_level
            for signal in signals
            if signal.risk_level
        }

        if "CRITICAL" in risk_levels:
            incident.risk_level = "CRITICAL"
        elif "HIGH" in risk_levels:
            incident.risk_level = "HIGH"
        elif "MEDIUM" in risk_levels:
            incident.risk_level = "MEDIUM"
        else:
            incident.risk_level = "LOW"

        for signal in signals:
            signal.incident_id = incident.id

        db.commit()
        db.refresh(incident)

        return {
            "id": incident.id,
            "incident_key": incident.incident_key,
            "title": incident.title,
            "status": incident.status,
            "risk_score": incident.risk_score,
            "risk_level": incident.risk_level,
            "signal_count": incident.signal_count,
            "platforms": incident.platforms or [],
            "locations": incident.locations or [],
            "organizations": incident.organizations or [],
            "entities": incident.entities or [],
        }