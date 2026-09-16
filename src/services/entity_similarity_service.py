def calculate_entity_similarity(
    entities_a: list[dict],
    entities_b: list[dict],
) -> float:

    if not entities_a or not entities_b:
        return 0.0

    values_a = {
        entity.get("text", "").lower()
        for entity in entities_a
        if entity.get("text")
    }

    values_b = {
        entity.get("text", "").lower()
        for entity in entities_b
        if entity.get("text")
    }

    if not values_a or not values_b:
        return 0.0

    intersection = values_a & values_b
    union = values_a | values_b

    similarity = len(intersection) / len(union)

    return round(float(similarity), 4)