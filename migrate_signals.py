import json
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert

from src.database.database import SessionLocal
from src.database.models import Signal


BASE_DIR = Path(__file__).resolve().parent

LIVE_FILE = (
    BASE_DIR
    / "data"
    / "live"
    / "ingested_signals.json"
)


def migrate_signals():
    if not LIVE_FILE.exists():
        print("Live signals file not found.")
        return

    with open(
        LIVE_FILE,
        "r",
        encoding="utf-8",
    ) as file:
        signals = json.load(file)

    if not isinstance(signals, list):
        print("Live signals file does not contain a list.")
        return

    inserted = 0
    skipped = 0

    with SessionLocal() as db:

        for signal in signals:

            statement = (
                insert(Signal)
                .values(
                    text=signal.get("text", ""),
                    platform=signal.get("platform"),
                    timestamp=signal.get("timestamp"),
                    author=signal.get("author"),
                    post_id=signal.get("post_id"),
                    url=signal.get("url"),
                    risk_score=signal.get("risk_score"),
                    risk_level=signal.get("risk_level"),
                    prediction=signal.get("prediction"),
                    confidence=signal.get("confidence"),
                    severity_terms=signal.get(
                        "severity_terms",
                        [],
                    ),
                    urgency_terms=signal.get(
                        "urgency_terms",
                        [],
                    ),
                    entities=signal.get(
                        "entities",
                        [],
                    ),
                )
                .on_conflict_do_nothing(
                    index_elements=[
                        "platform",
                        "post_id",
                    ]
                )
            )

            result = db.execute(statement)

            if result.rowcount == 1:
                inserted += 1
            else:
                skipped += 1

        db.commit()

    print(f"JSON signals found: {len(signals)}")
    print(f"Inserted into PostgreSQL: {inserted}")
    print(f"Skipped as duplicates: {skipped}")


if __name__ == "__main__":
    migrate_signals()