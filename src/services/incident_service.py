from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from src.database.database import SessionLocal
from src.database.models import Incident, Signal


def _incident_to_dict(
    incident: Incident,
) -> dict[str, Any]:
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
        "first_detected": (
            incident.first_detected.isoformat()
            if incident.first_detected
            else None
        ),
        "last_updated": (
            incident.last_updated.isoformat()
            if incident.last_updated
            else None
        ),
        "created_at": (
            incident.created_at.isoformat()
            if incident.created_at
            else None
        ),
    }


def create_incident(
    title: str,
    risk_score: float = 0,
    risk_level: str = "LOW",
    status: str = "ACTIVE",
) -> dict[str, Any]:

    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        incident = Incident(
            incident_key="TEMP",
            title=title,
            status=status,
            risk_score=risk_score,
            risk_level=risk_level,
            signal_count=0,
            platforms=[],
            locations=[],
            organizations=[],
            entities=[],
            first_detected=now,
            last_updated=now,
            created_at=now,
        )

        db.add(incident)
        db.flush()

        incident.incident_key = (
            f"INC-{incident.id:06d}"
        )

        db.commit()
        db.refresh(incident)

        return _incident_to_dict(incident)


def get_incident(
    incident_id: int,
) -> dict[str, Any] | None:

    with SessionLocal() as db:
        statement = select(Incident).where(
            Incident.id == incident_id
        )

        incident = (
            db.execute(statement)
            .scalars()
            .first()
        )

        if incident is None:
            return None

        return _incident_to_dict(incident)


def list_incidents() -> list[dict[str, Any]]:

    with SessionLocal() as db:
        statement = (
            select(Incident)
            .order_by(
                Incident.last_updated.desc()
            )
        )

        incidents = (
            db.execute(statement)
            .scalars()
            .all()
        )

        return [
            _incident_to_dict(incident)
            for incident in incidents
        ]


def attach_signal_to_incident(
    signal_id: int,
    incident_id: int,
) -> dict[str, Any] | None:

    with SessionLocal() as db:
        signal = db.get(
            Signal,
            signal_id,
        )

        incident = db.get(
            Incident,
            incident_id,
        )

        if signal is None or incident is None:
            return None

        signal.incident_id = incident.id

        db.flush()

        signals = (
            db.execute(
                select(Signal).where(
                    Signal.incident_id
                    == incident.id
                )
            )
            .scalars()
            .all()
        )

        incident.signal_count = len(signals)

        incident.platforms = sorted(
            {
                signal.platform
                for signal in signals
                if signal.platform
            }
        )

        incident.locations = sorted(
            {
                location
                for signal in signals
                for location in (
                    signal.locations or []
                )
                if location
            }
        )

        incident.organizations = sorted(
            {
                organization
                for signal in signals
                for organization in (
                    signal.organizations or []
                )
                if organization
            }
        )

        incident.entities = [
            entity
            for signal in signals
            for entity in (
                signal.entities or []
            )
        ]

        risk_scores = [
            signal.risk_score
            for signal in signals
            if signal.risk_score is not None
        ]

        if risk_scores:
            incident.risk_score = max(
                risk_scores
            )

        risk_levels = [
            signal.risk_level
            for signal in signals
            if signal.risk_level
        ]

        if "CRITICAL" in risk_levels:
            incident.risk_level = "CRITICAL"
        elif "HIGH" in risk_levels:
            incident.risk_level = "HIGH"
        elif "MEDIUM" in risk_levels:
            incident.risk_level = "MEDIUM"
        else:
            incident.risk_level = "LOW"

        timestamps = [
            signal.timestamp
            for signal in signals
            if signal.timestamp is not None
        ]

        if timestamps:
            incident.first_detected = min(
                timestamps
            )

        incident.last_updated = (
            datetime.now(timezone.utc)
        )

        db.commit()
        db.refresh(incident)

        return _incident_to_dict(incident)