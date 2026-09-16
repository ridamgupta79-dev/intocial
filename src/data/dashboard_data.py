import json
from pathlib import Path

import pandas as pd

from src.models.risk_service import calculate_risk


BASE_DIR = Path(__file__).resolve().parents[2]

DATA_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "crisisbench_train_processed.parquet"
)

OUTPUT_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "dashboard_signals.json"
)


def generate_dashboard_signals(limit: int = 100) -> list:
    """
    Generate risk-analyzed dashboard signals from the
    processed CrisisBench dataset.
    """

    df = pd.read_parquet(
        DATA_PATH,
        columns=["text"]
    )

    # Use a fixed sample so the dashboard remains reproducible.
    sample = df.sample(
        min(limit, len(df)),
        random_state=42
    )

    signals = []

    for text in sample["text"]:
        result = calculate_risk(text)

        signals.append(
            {
                "text": text,
                "risk_score": result["risk_score"],
                "risk_level": result["risk_level"],
                "prediction": result["prediction"],
                "confidence": result["confidence"],
                "severity_terms": result["severity_terms"],
                "urgency_terms": result["urgency_terms"],
                "entities": result["entities"],
            }
        )

    # Highest-risk signals first.
    signals.sort(
        key=lambda item: item["risk_score"],
        reverse=True
    )

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        OUTPUT_PATH,
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            signals,
            file,
            indent=4,
            ensure_ascii=False
        )

    return signals


def load_dashboard_signals() -> list:
    """
    Load previously generated dashboard signals.
    """

    if not OUTPUT_PATH.exists():
        return generate_dashboard_signals()

    with open(
        OUTPUT_PATH,
        "r",
        encoding="utf-8"
    ) as file:
        return json.load(file)