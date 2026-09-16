import re
from io import BytesIO

import joblib
import spacy
import torch

from PIL import Image
from scipy.sparse import hstack
from torchvision.models import resnet50, ResNet50_Weights

from src.models.model_service import predict_post


device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

nlp = spacy.load("en_core_web_sm")

weights = ResNet50_Weights.DEFAULT
image_transform = weights.transforms()

image_model = resnet50(weights=weights)
image_model.fc = torch.nn.Identity()
image_model = image_model.to(device)
image_model.eval()

MMD_TFIDF_PATH = "models/mmd_tfidf.pkl"
MULTIMODAL_MODEL_PATH = "models/multimodal_classifier.pkl"

mmd_tfidf = joblib.load(MMD_TFIDF_PATH)
multimodal_classifier = joblib.load(
    MULTIMODAL_MODEL_PATH
)


severity_keywords = {
    "death",
    "dead",
    "killed",
    "fatality",
    "casualties",
    "explosion",
    "attack",
    "collapse",
    "destroyed",
    "missing",
    "injured",
    "victim",
    "disaster",
    "fire",
    "flood",
    "earthquake",
    "shooting",
    "bomb",
    "crash",
}

urgency_keywords = {
    "urgent",
    "emergency",
    "help",
    "rescue",
    "trapped",
    "immediate",
    "evacuate",
    "evacuation",
    "need",
    "missing",
    "danger",
    "warning",
    "sos",
}

high_severity_phrases = {
    "people are trapped",
    "people trapped",
    "multiple people injured",
    "people are injured",
    "people seriously injured",
    "mass casualty",
    "mass casualties",
    "many people killed",
    "people have been killed",
    "building collapsed",
    "building has collapsed",
    "major explosion",
    "massive explosion",
    "active attack",
    "ongoing attack",
    "under attack",
}

critical_urgency_phrases = {
    "need immediate help",
    "need immediate rescue",
    "send help immediately",
    "send rescue immediately",
    "people need rescue",
    "people need immediate rescue",
    "trapped and need help",
    "trapped and need rescue",
    "urgent rescue needed",
    "emergency rescue needed",
}

negation_words = {
    "no",
    "not",
    "never",
    "without",
    "none",
    "nobody",
    "nothing",
    "didn't",
    "didnt",
    "doesn't",
    "doesnt",
    "isn't",
    "isnt",
    "wasn't",
    "wasnt",
    "weren't",
    "werent",
    "cannot",
    "can't",
    "cant",
}

historical_context_terms = {
    "yesterday",
    "last night",
    "last week",
    "last month",
    "previously",
    "earlier",
    "before",
    "ago",
    "in 2025",
    "in 2024",
}

active_context_terms = {
    "now",
    "right now",
    "currently",
    "currently happening",
    "ongoing",
    "at this moment",
    "happening now",
    "today",
}

emergency_request_phrases = {
    "please help",
    "please rescue",
    "need help",
    "need rescue",
    "send help",
    "send rescue",
    "help us",
    "save us",
    "someone help",
}

entity_labels = {
    "location": {
        "GPE",
        "LOC",
        "FAC",
    },
    "organization": {
        "ORG",
    },
    "person": {
        "PERSON",
    },
    "quantity": {
        "CARDINAL",
        "QUANTITY",
    },
}


def get_risk_level(score: float) -> str:
    if score >= 75:
        return "CRITICAL"
    elif score >= 50:
        return "HIGH"
    elif score >= 25:
        return "MEDIUM"
    else:
        return "LOW"


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def get_words(text: str) -> list[str]:
    return re.findall(
        r"\b[\w']+\b",
        text.lower()
    )


def is_negated(
    words: list[str],
    index: int,
    window: int = 4
) -> bool:
    start = max(0, index - window)

    previous_words = words[start:index]

    return any(
        word in negation_words
        for word in previous_words
    )


def find_keyword_matches(
    text: str,
    keywords: set[str]
) -> set[str]:
    words = get_words(text)
    matches = set()

    for index, word in enumerate(words):
        if word not in keywords:
            continue

        if is_negated(words, index):
            continue

        matches.add(word)

    return matches


def phrase_is_negated(
    text: str,
    phrase: str
) -> bool:
    words = get_words(text)
    phrase_words = get_words(phrase)

    if not phrase_words:
        return False

    phrase_length = len(phrase_words)

    for index in range(
        len(words) - phrase_length + 1
    ):
        if words[
            index:index + phrase_length
        ] != phrase_words:
            continue

        if is_negated(words, index):
            return True

    return False


def find_phrase_matches(
    text: str,
    phrases: set[str]
) -> set[str]:
    matches = set()

    for phrase in phrases:
        if phrase not in text:
            continue

        if phrase_is_negated(
            text,
            phrase
        ):
            continue

        matches.add(phrase)

    return matches


def detect_event_context(
    text: str
) -> dict:
    normalized_text = normalize_text(text)

    historical_matches = {
        term
        for term in historical_context_terms
        if term in normalized_text
    }

    active_matches = {
        term
        for term in active_context_terms
        if term in normalized_text
    }

    emergency_matches = {
        phrase
        for phrase in emergency_request_phrases
        if phrase in normalized_text
        and not phrase_is_negated(
            normalized_text,
            phrase
        )
    }

    historical = len(
        historical_matches
    ) > 0

    active = len(
        active_matches
    ) > 0

    emergency_request = len(
        emergency_matches
    ) > 0

    if active:
        context_type = "ACTIVE"
    elif emergency_request:
        context_type = "EMERGENCY_REQUEST"
    elif historical:
        context_type = "HISTORICAL"
    else:
        context_type = "UNSPECIFIED"

    return {
        "context_type": context_type,
        "historical_terms": sorted(
            historical_matches
        ),
        "active_terms": sorted(
            active_matches
        ),
        "emergency_request_phrases": sorted(
            emergency_matches
        ),
    }


def calculate_contextual_scores(
    text: str
) -> dict:
    normalized_text = normalize_text(text)

    severity_matches = find_keyword_matches(
        normalized_text,
        severity_keywords
    )

    urgency_matches = find_keyword_matches(
        normalized_text,
        urgency_keywords
    )

    severity_phrases = find_phrase_matches(
        normalized_text,
        high_severity_phrases
    )

    critical_phrases = find_phrase_matches(
        normalized_text,
        critical_urgency_phrases
    )

    event_context = detect_event_context(
        normalized_text
    )

    severity_score = min(
        len(severity_matches) * 12,
        36
    )

    urgency_score = min(
        len(urgency_matches) * 10,
        30
    )

    phrase_score = min(
        len(severity_phrases) * 15,
        30
    )

    critical_phrase_score = min(
        len(critical_phrases) * 20,
        40
    )

    active_emergency_bonus = 0

    if (
        event_context["context_type"]
        == "ACTIVE"
    ):
        active_emergency_bonus += 10

    if (
        event_context["context_type"]
        == "EMERGENCY_REQUEST"
    ):
        active_emergency_bonus += 15

    historical_penalty = 0

    if (
        event_context["context_type"]
        == "HISTORICAL"
    ):
        historical_penalty = 5

    return {
        "severity_matches": severity_matches,
        "urgency_matches": urgency_matches,
        "severity_phrases": severity_phrases,
        "critical_phrases": critical_phrases,
        "severity_score": severity_score,
        "urgency_score": urgency_score,
        "phrase_score": phrase_score,
        "critical_phrase_score": critical_phrase_score,
        "active_emergency_bonus": active_emergency_bonus,
        "historical_penalty": historical_penalty,
        "event_context": event_context,
    }


def extract_entities(text: str) -> list:
    doc = nlp(text)

    return [
        {
            "text": ent.text,
            "label": ent.label_
        }
        for ent in doc.ents
    ]


def analyze_entities(
    text: str,
    entities: list[dict],
    base_risk_score: float
) -> dict:
    locations = []
    organizations = []
    people = []
    quantities = []
    risk_entities = []

    for entity in entities:
        entity_text = entity["text"]
        label = entity["label"]

        if label in entity_labels["location"]:
            locations.append(entity_text)

        elif label in entity_labels["organization"]:
            organizations.append(entity_text)

        elif label in entity_labels["person"]:
            people.append(entity_text)

        elif label in entity_labels["quantity"]:
            quantities.append(entity_text)

    locations = sorted(set(locations))
    organizations = sorted(set(organizations))
    people = sorted(set(people))
    quantities = sorted(set(quantities))

    entity_risk_bonus = 0

    if base_risk_score >= 25:

        if locations:
            entity_risk_bonus += min(
                len(locations) * 3,
                6
            )

        if organizations:
            entity_risk_bonus += min(
                len(organizations) * 2,
                4
            )

    if (
        base_risk_score >= 50
        and quantities
    ):
        entity_risk_bonus += min(
            len(quantities) * 2,
            4
        )

    if (
        base_risk_score >= 50
        and people
    ):
        entity_risk_bonus += min(
            len(people),
            2
        )

    if base_risk_score >= 25:
        risk_entities = (
            locations
            + organizations
            + people
        )

    return {
        "locations": locations,
        "organizations": organizations,
        "people": people,
        "quantities": quantities,
        "risk_entities": sorted(
            set(risk_entities)
        ),
        "entity_risk_bonus": entity_risk_bonus,
    }


def build_risk_explanation(
    prediction: dict,
    context: dict,
    entity_analysis: dict,
    score_components: dict,
    total_score: float
) -> dict:
    factors = []

    severity_matches = score_components[
        "severity_matches"
    ]

    urgency_matches = score_components[
        "urgency_matches"
    ]

    severity_phrases = score_components[
        "severity_phrases"
    ]

    critical_phrases = score_components[
        "critical_phrases"
    ]

    if severity_matches:
        terms = ", ".join(
            sorted(severity_matches)
        )

        factors.append(
            f"Severity indicators detected: {terms}"
        )

    if severity_phrases:
        phrases = ", ".join(
            sorted(severity_phrases)
        )

        factors.append(
            f"High-severity context detected: {phrases}"
        )

    if urgency_matches:
        terms = ", ".join(
            sorted(urgency_matches)
        )

        factors.append(
            f"Urgency indicators detected: {terms}"
        )

    if critical_phrases:
        phrases = ", ".join(
            sorted(critical_phrases)
        )

        factors.append(
            f"Critical emergency language detected: {phrases}"
        )

    context_type = context[
        "event_context"
    ]["context_type"]

    if context_type == "ACTIVE":
        factors.append(
            "Signal indicates an active or ongoing event."
        )

    elif context_type == "EMERGENCY_REQUEST":
        factors.append(
            "Signal contains an explicit emergency assistance request."
        )

    elif context_type == "HISTORICAL":
        factors.append(
            "Signal contains historical-event context."
        )

    if entity_analysis["locations"]:
        locations = ", ".join(
            entity_analysis["locations"]
        )

        factors.append(
            f"Location identified: {locations}"
        )

    if entity_analysis["organizations"]:
        organizations = ", ".join(
            entity_analysis["organizations"]
        )

        factors.append(
            f"Organization identified: {organizations}"
        )

    if entity_analysis["people"]:
        people = ", ".join(
            entity_analysis["people"]
        )

        factors.append(
            f"Person identified: {people}"
        )

    if entity_analysis["quantities"]:
        quantities = ", ".join(
            entity_analysis["quantities"]
        )

        factors.append(
            f"Quantity information detected: {quantities}"
        )

    entity_bonus = entity_analysis[
        "entity_risk_bonus"
    ]

    if entity_bonus > 0:
        factors.append(
            f"Entity-aware risk contribution: +{entity_bonus}"
        )

    if prediction["prediction"] == "informative":
        confidence = round(
            prediction["confidence"] * 100,
            1
        )

        factors.append(
            f"Informative-content confidence: {confidence}%"
        )

    risk_level = get_risk_level(
        total_score
    )

    if risk_level == "CRITICAL":
        summary = (
            "Critical-risk signal requiring immediate attention."
        )
    elif risk_level == "HIGH":
        summary = (
            "High-risk signal requiring investigation."
        )
    elif risk_level == "MEDIUM":
        summary = (
            "Medium-risk signal containing relevant intelligence indicators."
        )
    else:
        summary = (
            "Low-risk signal with limited immediate threat indicators."
        )

    if not factors:
        factors.append(
            "No significant contextual risk indicators detected."
        )

    return {
        "summary": summary,
        "factors": factors,
        "score_components": {
            "severity": score_components[
                "severity_score"
            ],
            "urgency": score_components[
                "urgency_score"
            ],
            "high_severity_phrases": score_components[
                "phrase_score"
            ],
            "critical_urgency_phrases": score_components[
                "critical_phrase_score"
            ],
            "active_emergency": score_components[
                "active_emergency_bonus"
            ],
            "informative_content": score_components[
                "informative_bonus"
            ],
            "historical_penalty": score_components[
                "historical_penalty"
            ],
            "entity_bonus": entity_bonus,
        },
    }


def calculate_risk(text: str) -> dict:
    prediction = predict_post(text)

    context = calculate_contextual_scores(
        text
    )

    severity_matches = context[
        "severity_matches"
    ]

    urgency_matches = context[
        "urgency_matches"
    ]

    severity_phrases = context[
        "severity_phrases"
    ]

    critical_phrases = context[
        "critical_phrases"
    ]

    severity_score = context[
        "severity_score"
    ]

    urgency_score = context[
        "urgency_score"
    ]

    phrase_score = context[
        "phrase_score"
    ]

    critical_phrase_score = context[
        "critical_phrase_score"
    ]

    active_emergency_bonus = context[
        "active_emergency_bonus"
    ]

    historical_penalty = context[
        "historical_penalty"
    ]

    informative_bonus = 0

    if prediction["prediction"] == "informative":
        informative_bonus = round(
            prediction["confidence"] * 10,
            2
        )

    base_score = min(
        max(
            severity_score
            + urgency_score
            + phrase_score
            + critical_phrase_score
            + active_emergency_bonus
            + informative_bonus
            - historical_penalty,
            0
        ),
        100
    )

    entities = extract_entities(text)

    entity_analysis = analyze_entities(
        text,
        entities,
        base_score
    )

    total_score = min(
        base_score
        + entity_analysis[
            "entity_risk_bonus"
        ],
        100
    )

    score_components = {
        "severity_matches": severity_matches,
        "urgency_matches": urgency_matches,
        "severity_phrases": severity_phrases,
        "critical_phrases": critical_phrases,
        "severity_score": severity_score,
        "urgency_score": urgency_score,
        "phrase_score": phrase_score,
        "critical_phrase_score": critical_phrase_score,
        "active_emergency_bonus": active_emergency_bonus,
        "informative_bonus": informative_bonus,
        "historical_penalty": historical_penalty,
    }

    explanation = build_risk_explanation(
        prediction,
        context,
        entity_analysis,
        score_components,
        total_score
    )

    detected_terms = (
        set(severity_matches)
        | set(urgency_matches)
        | set(severity_phrases)
        | set(critical_phrases)
    )

    return {
        "risk_score": round(
            total_score,
            2
        ),
        "risk_level": get_risk_level(
            total_score
        ),
        "prediction": prediction[
            "prediction"
        ],
        "confidence": prediction[
            "confidence"
        ],
        "severity_terms": sorted(
            detected_terms.intersection(
                severity_keywords
            )
        ),
        "urgency_terms": sorted(
            detected_terms.intersection(
                urgency_keywords
            )
        ),
        "entities": entities,
        "locations": entity_analysis[
            "locations"
        ],
        "organizations": entity_analysis[
            "organizations"
        ],
        "people": entity_analysis[
            "people"
        ],
        "quantities": entity_analysis[
            "quantities"
        ],
        "risk_entities": entity_analysis[
            "risk_entities"
        ],
        "entity_risk_bonus": entity_analysis[
            "entity_risk_bonus"
        ],
        "context": context[
            "event_context"
        ],
        "explanation": explanation,
    }


def predict_multimodal(
    text: str,
    image_bytes: bytes
) -> dict:
    text_features = mmd_tfidf.transform(
        [text]
    )

    image = Image.open(
        BytesIO(image_bytes)
    ).convert("RGB")

    image_tensor = (
        image_transform(image)
        .unsqueeze(0)
        .to(device)
    )

    with torch.no_grad():
        image_feature = image_model(
            image_tensor
        )

    image_feature = (
        image_feature
        .cpu()
        .numpy()
        .reshape(1, -1)
    )

    combined_features = hstack([
        text_features,
        image_feature
    ])

    prediction = (
        multimodal_classifier
        .predict(combined_features)[0]
    )

    probabilities = (
        multimodal_classifier
        .predict_proba(
            combined_features
        )[0]
    )

    confidence = probabilities[
        prediction
    ]

    return {
        "prediction": int(prediction),
        "confidence": round(
            float(confidence),
            4
        )
    }