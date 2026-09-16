from datetime import date, timedelta
from typing import Any

from sqlalchemy import Date, func, select

from src.database.database import SessionLocal
from src.database.models import Signal


def apply_date_filters(
    statement,
    start_date: date | None = None,
    end_date: date | None = None,
):
    if start_date:
        statement = statement.where(
            Signal.timestamp >= start_date
        )

    if end_date:
        end_datetime = end_date + timedelta(days=1)

        statement = statement.where(
            Signal.timestamp < end_datetime
        )

    return statement


def get_historical_analytics(
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, Any]:
    with SessionLocal() as db:
        total_statement = select(
            func.count(Signal.id)
        )

        total_statement = apply_date_filters(
            total_statement,
            start_date,
            end_date,
        )

        total_signals = (
            db.execute(total_statement)
            .scalar_one()
        )

        average_risk_statement = select(
            func.avg(Signal.risk_score)
        )

        average_risk_statement = apply_date_filters(
            average_risk_statement,
            start_date,
            end_date,
        )

        average_risk_score = (
            db.execute(
                average_risk_statement
            ).scalar()
        )

        average_confidence_statement = select(
            func.avg(Signal.confidence)
        )

        average_confidence_statement = apply_date_filters(
            average_confidence_statement,
            start_date,
            end_date,
        )

        average_confidence = (
            db.execute(
                average_confidence_statement
            ).scalar()
        )

        risk_statement = select(
            Signal.risk_level,
            func.count(Signal.id),
        )

        risk_statement = apply_date_filters(
            risk_statement,
            start_date,
            end_date,
        )

        risk_statement = risk_statement.group_by(
            Signal.risk_level
        )

        risk_rows = (
            db.execute(risk_statement)
            .all()
        )

        risk_distribution = {
            "LOW": 0,
            "MEDIUM": 0,
            "HIGH": 0,
            "CRITICAL": 0,
        }

        for risk_level, count in risk_rows:
            if risk_level in risk_distribution:
                risk_distribution[risk_level] = count

        platform_statement = select(
            Signal.platform,
            func.count(Signal.id),
        )

        platform_statement = apply_date_filters(
            platform_statement,
            start_date,
            end_date,
        )

        platform_statement = platform_statement.group_by(
            Signal.platform
        )

        platform_rows = (
            db.execute(platform_statement)
            .all()
        )

        platform_distribution = {}

        for platform, count in platform_rows:
            if platform:
                platform_distribution[platform] = count

        prediction_statement = select(
            Signal.prediction,
            func.count(Signal.id),
        )

        prediction_statement = apply_date_filters(
            prediction_statement,
            start_date,
            end_date,
        )

        prediction_statement = prediction_statement.group_by(
            Signal.prediction
        )

        prediction_rows = (
            db.execute(prediction_statement)
            .all()
        )

        prediction_distribution = {}

        for prediction, count in prediction_rows:
            if prediction:
                prediction_distribution[prediction] = count

        return {
            "total_signals": total_signals,
            "average_risk_score": (
                round(
                    float(average_risk_score),
                    2,
                )
                if average_risk_score is not None
                else 0
            ),
            "average_confidence": (
                round(
                    float(average_confidence),
                    4,
                )
                if average_confidence is not None
                else 0
            ),
            "risk_distribution": risk_distribution,
            "platform_distribution": platform_distribution,
            "prediction_distribution": prediction_distribution,
        }


def get_risk_trends(
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        date_expression = func.cast(
            Signal.timestamp,
            Date,
        )

        statement = select(
            date_expression.label("date"),
            Signal.risk_level,
            func.count(Signal.id).label("count"),
        )

        statement = apply_date_filters(
            statement,
            start_date,
            end_date,
        )

        statement = (
            statement
            .where(
                Signal.timestamp.is_not(None)
            )
            .group_by(
                date_expression,
                Signal.risk_level,
            )
            .order_by(
                date_expression.asc()
            )
        )

        rows = db.execute(statement).all()

        trends = {}

        for date_value, risk_level, count in rows:
            date_key = date_value.isoformat()

            if date_key not in trends:
                trends[date_key] = {
                    "date": date_key,
                    "LOW": 0,
                    "MEDIUM": 0,
                    "HIGH": 0,
                    "CRITICAL": 0,
                }

            if risk_level in trends[date_key]:
                trends[date_key][risk_level] = count

        return list(trends.values())


def get_platform_analytics(
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        statement = select(
            Signal.platform,
            func.count(Signal.id),
            func.avg(Signal.risk_score),
            func.avg(Signal.confidence),
        )

        statement = apply_date_filters(
            statement,
            start_date,
            end_date,
        )

        statement = statement.group_by(
            Signal.platform
        )

        rows = db.execute(statement).all()

        risk_statement = select(
            Signal.platform,
            Signal.risk_level,
            func.count(Signal.id),
        )

        risk_statement = apply_date_filters(
            risk_statement,
            start_date,
            end_date,
        )

        risk_statement = risk_statement.group_by(
            Signal.platform,
            Signal.risk_level,
        )

        risk_rows = db.execute(
            risk_statement
        ).all()

        platform_risks = {}

        for platform, risk_level, count in risk_rows:
            if platform not in platform_risks:
                platform_risks[platform] = {
                    "LOW": 0,
                    "MEDIUM": 0,
                    "HIGH": 0,
                    "CRITICAL": 0,
                }

            if risk_level in platform_risks[platform]:
                platform_risks[platform][risk_level] = count

        analytics = []

        for (
            platform,
            total,
            average_risk,
            average_confidence,
        ) in rows:
            analytics.append({
                "platform": platform,
                "total_signals": total,
                "average_risk_score": (
                    round(
                        float(average_risk),
                        2,
                    )
                    if average_risk is not None
                    else 0
                ),
                "average_confidence": (
                    round(
                        float(average_confidence),
                        4,
                    )
                    if average_confidence is not None
                    else 0
                ),
                "risk_distribution": platform_risks.get(
                    platform,
                    {
                        "LOW": 0,
                        "MEDIUM": 0,
                        "HIGH": 0,
                        "CRITICAL": 0,
                    },
                ),
            })

        analytics.sort(
            key=lambda item: item["total_signals"],
            reverse=True,
        )

        return analytics


def get_activity_anomalies(
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        date_expression = func.cast(
            Signal.timestamp,
            Date,
        )

        statement = select(
            date_expression.label("date"),
            func.count(Signal.id).label("count"),
        )

        statement = apply_date_filters(
            statement,
            start_date,
            end_date,
        )

        statement = (
            statement
            .where(
                Signal.timestamp.is_not(None)
            )
            .group_by(
                date_expression
            )
            .order_by(
                date_expression.asc()
            )
        )

        rows = db.execute(statement).all()

        if not rows:
            return []

        daily_counts = [
            count
            for _, count in rows
        ]

        sorted_counts = sorted(daily_counts)
        middle = len(sorted_counts) // 2

        if len(sorted_counts) % 2 == 0:
            median = (
                sorted_counts[middle - 1]
                + sorted_counts[middle]
            ) / 2
        else:
            median = sorted_counts[middle]

        deviations = [
            abs(count - median)
            for count in daily_counts
        ]

        sorted_deviations = sorted(deviations)
        middle = len(sorted_deviations) // 2

        if len(sorted_deviations) % 2 == 0:
            mad = (
                sorted_deviations[middle - 1]
                + sorted_deviations[middle]
            ) / 2
        else:
            mad = sorted_deviations[middle]

        anomalies = []

        for date_value, count in rows:
            if mad == 0:
                anomaly_score = 0
            else:
                anomaly_score = (
                    0.6745
                    * (count - median)
                    / mad
                )

            anomalies.append({
                "date": date_value.isoformat(),
                "signal_count": count,
                "baseline_median": round(
                    float(median),
                    2,
                ),
                "anomaly_score": round(
                    float(anomaly_score),
                    2,
                ),
                "is_anomaly": (
                    abs(anomaly_score) >= 3.5
                ),
            })

        return anomalies


def get_high_risk_anomalies(
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        date_expression = func.cast(
            Signal.timestamp,
            Date,
        )

        statement = select(
            date_expression.label("date"),
            func.count(Signal.id).label("count"),
        )

        statement = apply_date_filters(
            statement,
            start_date,
            end_date,
        )

        statement = (
            statement
            .where(
                Signal.timestamp.is_not(None),
                Signal.risk_level.in_([
                    "HIGH",
                    "CRITICAL",
                ]),
            )
            .group_by(
                date_expression
            )
            .order_by(
                date_expression.asc()
            )
        )

        rows = db.execute(statement).all()

        if not rows:
            return []

        counts = [
            count
            for _, count in rows
        ]

        sorted_counts = sorted(counts)
        middle = len(sorted_counts) // 2

        if len(sorted_counts) % 2 == 0:
            median = (
                sorted_counts[middle - 1]
                + sorted_counts[middle]
            ) / 2
        else:
            median = sorted_counts[middle]

        deviations = [
            abs(count - median)
            for count in counts
        ]

        sorted_deviations = sorted(deviations)
        middle = len(sorted_deviations) // 2

        if len(sorted_deviations) % 2 == 0:
            mad = (
                sorted_deviations[middle - 1]
                + sorted_deviations[middle]
            ) / 2
        else:
            mad = sorted_deviations[middle]

        anomalies = []

        for date_value, count in rows:
            if mad == 0:
                anomaly_score = 0
            else:
                anomaly_score = (
                    0.6745
                    * (count - median)
                    / mad
                )

            anomalies.append({
                "date": date_value.isoformat(),
                "high_risk_count": count,
                "baseline_median": round(
                    float(median),
                    2,
                ),
                "anomaly_score": round(
                    float(anomaly_score),
                    2,
                ),
                "is_anomaly": (
                    abs(anomaly_score) >= 3.5
                ),
            })

        return anomalies