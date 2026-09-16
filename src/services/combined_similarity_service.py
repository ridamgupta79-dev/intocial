from src.services.similarity_service import (
    calculate_text_similarity,
)
from src.services.entity_similarity_service import (
    calculate_entity_similarity,
)


def calculate_combined_similarity(
    text_a: str,
    text_b: str,
    entities_a: list[dict],
    entities_b: list[dict],
) -> dict:

    text_similarity = calculate_text_similarity(
        text_a,
        text_b,
    )

    entity_similarity = calculate_entity_similarity(
        entities_a,
        entities_b,
    )

    combined_similarity = (
        (text_similarity * 0.7)
        + (entity_similarity * 0.3)
    )

    return {
        "text_similarity": round(
            text_similarity,
            4,
        ),
        "entity_similarity": round(
            entity_similarity,
            4,
        ),
        "combined_similarity": round(
            combined_similarity,
            4,
        ),
    }