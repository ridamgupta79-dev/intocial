from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select

from src.database.database import SessionLocal
from src.database.models import Alert, Incident


def _alert_to_dict(
    alert: Alert,
) -> dict[str, Any]:
    return {
        "id": alert.id,
        "alert_key": alert.alert_key,
        "incident_id": alert.incident_id,
        "severity": alert.severity,
        "title": alert.title,
        "message": alert.message,
        "status": alert.status,
        "created_at": (
            alert.created_at.isoformat()
            if alert.created_at
            else None
        ),
        "acknowledged_at": (
            alert.acknowledged_at.isoformat()
            if alert.acknowledged_at
            else None
        ),
    }


def generate_alert(
    incident_id: int,
) -> dict[str, Any] | None:

    with SessionLocal() as db:
        incident = db.get(
            Incident,
            incident_id,
        )

        if incident is None:
            return None

        if incident.risk_level not in {
            "HIGH",
            "CRITICAL",
        }:
            return None

        existing = (
            db.execute(
                select(Alert)
                .where(
                    Alert.incident_id
                    == incident_id,
                    Alert.status
                    == "OPEN",
                )
            )
            .scalars()
            .first()
        )

        if existing is not None:
            return _alert_to_dict(existing)

        now = datetime.now(timezone.utc)

        alert = Alert(
            alert_key="TEMP",
            incident_id=incident.id,
            severity=incident.risk_level,
            title=(
                f"{incident.risk_level} Risk Incident "
                f"Detected"
            ),
            message=(
                f"Incident {incident.incident_key} "
                f"has reached {incident.risk_level} "
                f"risk with {incident.signal_count} "
                f"associated signals."
            ),
            status="OPEN",
            created_at=now,
        )

        db.add(alert)
        db.flush()

        alert.alert_key = (
            f"ALT-{alert.id:06d}"
        )

        db.commit()
        db.refresh(alert)

        return _alert_to_dict(alert)


def get_alert(
    alert_id: int,
) -> dict[str, Any] | None:

    with SessionLocal() as db:
        alert = db.get(
            Alert,
            alert_id,
        )

        if alert is None:
            return None

        return _alert_to_dict(alert)


def list_alerts() -> list[dict[str, Any]]:

    with SessionLocal() as db:
        statement = (
            select(Alert)
            .order_by(
                Alert.created_at.desc()
            )
        )

        alerts = (
            db.execute(statement)
            .scalars()
            .all()
        )

        return [
            _alert_to_dict(alert)
            for alert in alerts
        ]

def acknowledge_alert(
    alert_id: int,
) -> dict[str, Any] | None:

    with SessionLocal() as db:
        alert = db.get(
            Alert,
            alert_id,
        )

        if alert is None:
            return None

        if alert.status == "ACKNOWLEDGED":
            return _alert_to_dict(alert)

        alert.status = "ACKNOWLEDGED"
        alert.acknowledged_at = (
            datetime.now(timezone.utc)
        )

        db.commit()
        db.refresh(alert)

        return _alert_to_dict(alert)