from src.services.combined_similarity_service import (
    calculate_combined_similarity,
)


SIMILARITY_THRESHOLD = 0.65


def cluster_signals(
    signals: list[dict],
) -> list[list[dict]]:

    if not signals:
        return []

    clusters: list[list[dict]] = []

    for signal in signals:
        assigned = False

        for cluster in clusters:
            representative = cluster[0]

            similarity = calculate_combined_similarity(
                signal.get("text", ""),
                representative.get("text", ""),
                signal.get("entities", []),
                representative.get("entities", []),
            )

            if (
                similarity["combined_similarity"]
                >= SIMILARITY_THRESHOLD
            ):
                cluster.append(signal)
                assigned = True
                break

        if not assigned:
            clusters.append([signal])

    return clusters