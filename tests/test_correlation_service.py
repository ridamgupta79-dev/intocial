from src.services.correlation_service import (
    correlate_signals,
    calculate_cross_platform_score,
    calculate_temporal_score,
    calculate_event_confidence,
    analyze_event_correlation,
)


def make_signal(
    signal_id,
    text,
    platform,
    timestamp,
    entities=None,
):
    return {
        "id": signal_id,
        "text": text,
        "platform": platform,
        "timestamp": timestamp,
        "entities": entities or [],
    }


def test_signal_correlation():
    signal_a = make_signal(
        1,
        "Flooding reported in Delhi",
        "x",
        "2026-09-10T10:00:00+00:00",
        [{"text": "Delhi"}],
    )

    signal_b = make_signal(
        2,
        "Severe flooding reported in Delhi",
        "reddit",
        "2026-09-10T10:30:00+00:00",
        [{"text": "Delhi"}],
    )

    result = correlate_signals(signal_a, signal_b)

    assert result["cross_platform"] is True
    assert result["entity_similarity"] > 0
    assert result["combined_similarity"] > 0


def test_cross_platform_score():
    signals = [
        {"platform": "x"},
        {"platform": "reddit"},
        {"platform": "youtube"},
    ]

    result = calculate_cross_platform_score(signals)

    assert result["platform_count"] == 3
    assert result["cross_platform_score"] == 0.85
    assert result["corroborated"] is True


def test_temporal_score():
    result = calculate_temporal_score(
        "2026-09-10T10:00:00+00:00",
        "2026-09-10T10:30:00+00:00",
    )

    assert result["time_difference_minutes"] == 30
    assert result["temporal_score"] == 0.8
    assert result["temporally_correlated"] is True


def test_event_confidence():
    result = calculate_event_confidence(
        {"combined_similarity": 0.8},
        {"cross_platform_score": 0.85},
        {"temporal_score": 0.8},
    )

    assert result["event_confidence"] == 0.815
    assert result["confidence_percentage"] == 81.5
    assert result["confidence_level"] == "VERY_HIGH"


def test_event_correlation():
    signals = [
        make_signal(
            1,
            "Flooding reported in Delhi",
            "x",
            "2026-09-10T10:00:00+00:00",
            [{"text": "Delhi"}],
        ),
        make_signal(
            2,
            "Severe flooding reported in Delhi",
            "reddit",
            "2026-09-10T10:30:00+00:00",
            [{"text": "Delhi"}],
        ),
    ]

    result = analyze_event_correlation(signals)

    assert result["signal_count"] == 2
    assert result["pair_count"] == 1
    assert result["cross_platform"]["corroborated"] is True
    assert result["correlated"] is True
    assert result["confidence"]["event_confidence"] > 0