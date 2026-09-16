from datetime import datetime

from src.database.database import SessionLocal
from src.database.models import Incident, Signal


def _risk_level(score):
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 30:
        return "MEDIUM"
    return "LOW"


def generate_intelligence_report(incident_id: int):
    db = SessionLocal()

    try:
        incident = (
            db.query(Incident)
            .filter(Incident.id == incident_id)
            .first()
        )

        if incident is None:
            return None

        signals = (
            db.query(Signal)
            .filter(Signal.incident_id == incident_id)
            .order_by(Signal.timestamp.asc())
            .all()
        )

        platforms = sorted({
            signal.platform
            for signal in signals
            if signal.platform
        })

        locations = sorted({
            location
            for signal in signals
            for location in (signal.locations or [])
            if location
        })

        organizations = sorted({
            organization
            for signal in signals
            for organization in (signal.organizations or [])
            if organization
        })

        entities = sorted({
            entity.get("text")
            for signal in signals
            for entity in (signal.entities or [])
            if isinstance(entity, dict) and entity.get("text")
        })

        high_risk_signals = [
            signal
            for signal in signals
            if signal.risk_level in {"HIGH", "CRITICAL"}
        ]

        risk_score = incident.risk_score or 0
        risk_level = incident.risk_level or _risk_level(risk_score)

        timeline = [
            {
                "signal_id": signal.id,
                "timestamp": signal.timestamp,
                "platform": signal.platform,
                "risk_score": signal.risk_score,
                "risk_level": signal.risk_level,
            }
            for signal in signals
        ]

        findings = []

        if len(platforms) >= 2:
            findings.append(
                f"Activity observed across {len(platforms)} platforms."
            )

        if high_risk_signals:
            findings.append(
                f"{len(high_risk_signals)} high-risk signal(s) "
                "require attention."
            )

        if locations:
            findings.append(
                f"Key location(s): {', '.join(locations[:10])}."
            )

        if organizations:
            findings.append(
                f"Organizations detected: "
                f"{', '.join(organizations[:10])}."
            )

        if not findings:
            findings.append(
                "Limited corroborating intelligence is currently available."
            )

        if risk_level == "CRITICAL":
            assessment = "Immediate attention recommended."
        elif risk_level == "HIGH":
            assessment = "Priority monitoring recommended."
        elif risk_level == "MEDIUM":
            assessment = "Continued monitoring recommended."
        else:
            assessment = "Routine monitoring recommended."

        return {
            "report_generated_at": datetime.utcnow(),
            "incident": {
                "id": incident.id,
                "incident_key": incident.incident_key,
                "title": incident.title,
                "status": incident.status,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "signal_count": len(signals),
            },
            "overview": {
                "platforms": platforms,
                "locations": locations,
                "organizations": organizations,
                "entities": entities,
            },
            "risk_assessment": {
                "score": risk_score,
                "level": risk_level,
                "assessment": assessment,
            },
            "explainability": build_explainability(signals),
            "findings": findings,
            "timeline": timeline,
            "signals": [
                {
                    "id": signal.id,
                    "text": signal.text,
                    "platform": signal.platform,
                    "timestamp": signal.timestamp,
                    "risk_score": signal.risk_score,
                    "risk_level": signal.risk_level,
                    "prediction": signal.prediction,
                    "confidence": signal.confidence,
                    "explanation": signal.explanation or {},
                }
                for signal in signals
            ],
        }

    finally:
        db.close()

def build_explainability(signals):
    if not signals:
        return {
            "risk_drivers": [],
            "severity_distribution": {},
            "platform_distribution": {},
            "explanation": "No signals available for analysis.",
        }

    risk_drivers = []

    high_count = sum(
        1
        for signal in signals
        if signal.risk_level in {"HIGH", "CRITICAL"}
    )

    critical_count = sum(
        1
        for signal in signals
        if signal.risk_level == "CRITICAL"
    )

    platforms = {}

    for signal in signals:
        platform = signal.platform or "unknown"
        platforms[platform] = platforms.get(platform, 0) + 1

    severity_distribution = {}

    for signal in signals:
        level = signal.risk_level or "UNKNOWN"
        severity_distribution[level] = (
            severity_distribution.get(level, 0) + 1
        )

    if high_count:
        risk_drivers.append({
            "factor": "High-risk signals",
            "count": high_count,
            "impact": "HIGH",
        })

    if critical_count:
        risk_drivers.append({
            "factor": "Critical signals",
            "count": critical_count,
            "impact": "CRITICAL",
        })

    if len(platforms) >= 2:
        risk_drivers.append({
            "factor": "Cross-platform activity",
            "platform_count": len(platforms),
            "impact": "MEDIUM",
        })

    entity_count = sum(
        len(signal.entities or [])
        for signal in signals
    )

    if entity_count:
        risk_drivers.append({
            "factor": "Detected entities",
            "count": entity_count,
            "impact": "MEDIUM",
        })

    if not risk_drivers:
        risk_drivers.append({
            "factor": "No significant risk driver detected",
            "impact": "LOW",
        })

    explanation = (
        f"The incident contains {len(signals)} signals "
        f"across {len(platforms)} platform(s). "
        f"{high_count} signal(s) are classified as high or critical risk."
    )

    return {
        "risk_drivers": risk_drivers,
        "severity_distribution": severity_distribution,
        "platform_distribution": platforms,
        "explanation": explanation,
    }