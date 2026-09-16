from typing import Any

from src.services.combined_similarity_service import (
    calculate_combined_similarity,
)


def correlate_signals(
    signal_a: dict[str, Any],
    signal_b: dict[str, Any],
) -> dict[str, Any]:

    similarity = calculate_combined_similarity(
        signal_a.get("text", ""),
        signal_b.get("text", ""),
        signal_a.get("entities", []),
        signal_b.get("entities", []),
    )

    same_platform = (
        signal_a.get("platform")
        == signal_b.get("platform")
    )

    cross_platform = not same_platform

    correlated = (
        similarity["combined_similarity"] >= 0.65
    )

    evidence = []

    if similarity["text_similarity"] >= 0.65:
        evidence.append(
            "High textual similarity"
        )

    if similarity["entity_similarity"] > 0:
        evidence.append(
            "Shared entities"
        )

    if cross_platform:
        evidence.append(
            "Cross-platform corroboration"
        )

    return {
        "correlated": correlated,
        "text_similarity": similarity[
            "text_similarity"
        ],
        "entity_similarity": similarity[
            "entity_similarity"
        ],
        "combined_similarity": similarity[
            "combined_similarity"
        ],
        "cross_platform": cross_platform,
        "evidence": evidence,
    }

def calculate_cross_platform_score(
    signals: list[dict[str, Any]],
) -> dict[str, Any]:

    platforms = {
        signal.get("platform")
        for signal in signals
        if signal.get("platform")
    }

    platform_count = len(platforms)

    if platform_count >= 4:
        score = 1.0
    elif platform_count == 3:
        score = 0.85
    elif platform_count == 2:
        score = 0.65
    else:
        score = 0.0

    return {
        "platform_count": platform_count,
        "platforms": sorted(platforms),
        "cross_platform_score": score,
        "corroborated": platform_count >= 2,
    }

from datetime import datetime


def calculate_temporal_score(
    timestamp_a: str | datetime | None,
    timestamp_b: str | datetime | None,
) -> dict[str, Any]:

    if not timestamp_a or not timestamp_b:
        return {
            "time_difference_minutes": None,
            "temporal_score": 0.0,
            "temporally_correlated": False,
        }

    if isinstance(timestamp_a, str):
        timestamp_a = datetime.fromisoformat(
            timestamp_a.replace("Z", "+00:00")
        )

    if isinstance(timestamp_b, str):
        timestamp_b = datetime.fromisoformat(
            timestamp_b.replace("Z", "+00:00")
        )

    difference_minutes = abs(
        (
            timestamp_a - timestamp_b
        ).total_seconds()
    ) / 60

    if difference_minutes <= 15:
        score = 1.0
    elif difference_minutes <= 60:
        score = 0.8
    elif difference_minutes <= 180:
        score = 0.5
    elif difference_minutes <= 360:
        score = 0.25
    else:
        score = 0.0

    return {
        "time_difference_minutes": round(
            difference_minutes,
            2,
        ),
        "temporal_score": score,
        "temporally_correlated": (
            difference_minutes <= 180
        ),
    }

def calculate_event_confidence(
    correlation: dict[str, Any],
    cross_platform: dict[str, Any],
    temporal: dict[str, Any],
) -> dict[str, Any]:

    similarity_score = correlation.get(
        "combined_similarity",
        0.0,
    )

    platform_score = cross_platform.get(
        "cross_platform_score",
        0.0,
    )

    temporal_score = temporal.get(
        "temporal_score",
        0.0,
    )

    confidence = (
        similarity_score * 0.5
        + platform_score * 0.3
        + temporal_score * 0.2
    )

    confidence = round(
        min(confidence, 1.0),
        4,
    )

    if confidence >= 0.80:
        confidence_level = "VERY_HIGH"
    elif confidence >= 0.60:
        confidence_level = "HIGH"
    elif confidence >= 0.40:
        confidence_level = "MEDIUM"
    else:
        confidence_level = "LOW"

    return {
        "event_confidence": confidence,
        "confidence_percentage": round(
            confidence * 100,
            2,
        ),
        "confidence_level": confidence_level,
    }

def analyze_event_correlation(signals: list[dict[str, Any]]) -> dict[str, Any]:
    if len(signals) < 2:
        return {
            "signal_count": len(signals),
            "correlated": False,
            "event_confidence": 0.0,
            "confidence_percentage": 0.0,
            "confidence_level": "LOW",
            "pairs": [],
        }

    pairs = []

    for i in range(len(signals)):
        for j in range(i + 1, len(signals)):
            signal_a = signals[i]
            signal_b = signals[j]

            correlation = correlate_signals(signal_a, signal_b)

            temporal = calculate_temporal_score(
                signal_a.get("timestamp"),
                signal_b.get("timestamp"),
            )

            pairs.append({
                "signal_a": signal_a.get("id"),
                "signal_b": signal_b.get("id"),
                "correlation": correlation,
                "temporal": temporal,
            })

    cross_platform = calculate_cross_platform_score(signals)

    average_similarity = sum(
        pair["correlation"]["combined_similarity"]
        for pair in pairs
    ) / len(pairs)

    average_temporal = sum(
        pair["temporal"]["temporal_score"]
        for pair in pairs
    ) / len(pairs)

    confidence = calculate_event_confidence(
        {
            "combined_similarity": average_similarity,
        },
        cross_platform,
        {
            "temporal_score": average_temporal,
        },
    )

    correlated_pairs = sum(
        1
        for pair in pairs
        if pair["correlation"]["correlated"]
    )

    return {
        "signal_count": len(signals),
        "pair_count": len(pairs),
        "correlated_pairs": correlated_pairs,
        "correlated": correlated_pairs > 0,
        "average_similarity": round(average_similarity, 4),
        "average_temporal_score": round(average_temporal, 4),
        "cross_platform": cross_platform,
        "confidence": confidence,
        "pairs": pairs,
    }