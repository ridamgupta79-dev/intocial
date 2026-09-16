import pytest

import src.models.risk_service as risk_service


@pytest.fixture
def mock_prediction(monkeypatch):
    def fake_predict_post(text):
        return {
            "prediction": "informative",
            "confidence": 0.90,
        }

    monkeypatch.setattr(
        risk_service,
        "predict_post",
        fake_predict_post,
    )


def test_risk_level_boundaries():
    assert risk_service.get_risk_level(0) == "LOW"
    assert risk_service.get_risk_level(24.99) == "LOW"
    assert risk_service.get_risk_level(25) == "MEDIUM"
    assert risk_service.get_risk_level(49.99) == "MEDIUM"
    assert risk_service.get_risk_level(50) == "HIGH"
    assert risk_service.get_risk_level(74.99) == "HIGH"
    assert risk_service.get_risk_level(75) == "CRITICAL"
    assert risk_service.get_risk_level(100) == "CRITICAL"


def test_negated_explosion_is_not_detected():
    result = risk_service.calculate_contextual_scores(
        "No explosion occurred near the station."
    )

    assert "explosion" not in result[
        "severity_matches"
    ]


def test_negated_injury_is_not_detected():
    result = risk_service.calculate_contextual_scores(
        "Nobody was injured in the accident."
    )

    assert "injured" not in result[
        "severity_matches"
    ]


def test_historical_context():
    result = risk_service.detect_event_context(
        "The explosion happened yesterday."
    )

    assert result["context_type"] == "HISTORICAL"
    assert "yesterday" in result[
        "historical_terms"
    ]


def test_active_context():
    result = risk_service.detect_event_context(
        "The explosion is happening right now."
    )

    assert result["context_type"] == "ACTIVE"
    assert "right now" in result[
        "active_terms"
    ]


def test_emergency_request_context():
    result = risk_service.detect_event_context(
        "People are trapped. Please help us."
    )

    assert (
        result["context_type"]
        == "EMERGENCY_REQUEST"
    )

    assert "please help" in result[
        "emergency_request_phrases"
    ]


def test_unspecified_context():
    result = risk_service.detect_event_context(
        "The city announced a preparedness program."
    )

    assert result["context_type"] == "UNSPECIFIED"


def test_location_entity_extraction():
    entities = risk_service.extract_entities(
        "An explosion occurred in Delhi."
    )

    locations = [
        entity["text"]
        for entity in entities
        if entity["label"] in {
            "GPE",
            "LOC",
            "FAC",
        }
    ]

    assert "Delhi" in locations


def test_entity_analysis_without_risk():
    entities = [
        {
            "text": "Delhi",
            "label": "GPE",
        }
    ]

    result = risk_service.analyze_entities(
        "Delhi hosted a conference.",
        entities,
        10,
    )

    assert result["locations"] == ["Delhi"]
    assert result["risk_entities"] == []
    assert result["entity_risk_bonus"] == 0


def test_entity_analysis_with_risk():
    entities = [
        {
            "text": "Delhi",
            "label": "GPE",
        }
    ]

    result = risk_service.analyze_entities(
        "Explosion reported in Delhi.",
        entities,
        50,
    )

    assert result["locations"] == ["Delhi"]
    assert "Delhi" in result[
        "risk_entities"
    ]
    assert result["entity_risk_bonus"] > 0


def test_risk_calculation_contains_explanation(
    mock_prediction,
):
    result = risk_service.calculate_risk(
        "A major explosion occurred in Delhi. "
        "People are trapped and need immediate rescue "
        "right now."
    )

    assert "explanation" in result
    assert "summary" in result["explanation"]
    assert "factors" in result["explanation"]
    assert "score_components" in result[
        "explanation"
    ]


def test_risk_calculation_contains_entities(
    mock_prediction,
):
    result = risk_service.calculate_risk(
        "A major explosion occurred in Delhi."
    )

    assert "entities" in result
    assert "locations" in result
    assert "risk_entities" in result
    assert "entity_risk_bonus" in result


def test_active_emergency_has_risk_indicators(
    mock_prediction,
):
    result = risk_service.calculate_risk(
        "People are trapped and need immediate rescue "
        "right now."
    )

    assert result["risk_score"] > 0
    assert result["risk_level"] in {
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    }

    assert (
        result["context"]["context_type"]
        == "ACTIVE"
    )


def test_historical_event_is_penalized(
    mock_prediction,
):
    historical = (
        "The explosion happened yesterday."
    )

    active = (
        "The explosion is happening right now."
    )

    historical_result = (
        risk_service.calculate_risk(
            historical
        )
    )

    active_result = (
        risk_service.calculate_risk(
            active
        )
    )

    assert (
        active_result["risk_score"]
        > historical_result["risk_score"]
    )


def test_negation_does_not_create_severity(
    mock_prediction,
):
    result = risk_service.calculate_risk(
        "No explosion occurred and nobody was injured."
    )

    assert "explosion" not in result[
        "severity_terms"
    ]

    assert "injured" not in result[
        "severity_terms"
    ]


def test_explanation_contains_detected_severity(
    mock_prediction,
):
    result = risk_service.calculate_risk(
        "A major explosion occurred in Delhi."
    )

    factors = result[
        "explanation"
    ]["factors"]

    combined_factors = " ".join(
        factors
    ).lower()

    assert "explosion" in combined_factors


def test_explanation_contains_location(
    mock_prediction,
):
    result = risk_service.calculate_risk(
        "A major explosion occurred in Delhi."
    )

    factors = result[
        "explanation"
    ]["factors"]

    combined_factors = " ".join(
        factors
    ).lower()

    assert "delhi" in combined_factors


def test_score_is_within_valid_range(
    mock_prediction,
):
    test_cases = [
        "Nothing happened.",
        "There was a fire.",
        "People are trapped and need rescue.",
        "Major explosion with multiple casualties.",
        "Emergency rescue needed right now.",
    ]

    for text in test_cases:
        result = risk_service.calculate_risk(
            text
        )

        assert 0 <= result[
            "risk_score"
        ] <= 100