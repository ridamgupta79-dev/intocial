from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def calculate_text_similarity(
    text_a: str,
    text_b: str,
) -> float:
    if not text_a or not text_b:
        return 0.0

    vectorizer = TfidfVectorizer(
        stop_words="english"
    )

    vectors = vectorizer.fit_transform(
        [text_a, text_b]
    )

    similarity = cosine_similarity(
        vectors[0:1],
        vectors[1:2]
    )[0][0]

    return round(float(similarity), 4)


def calculate_similarity_matrix(
    texts: list[str],
) -> list[list[float]]:

    if not texts:
        return []

    vectorizer = TfidfVectorizer(
        stop_words="english"
    )

    vectors = vectorizer.fit_transform(texts)

    matrix = cosine_similarity(vectors)

    return [
        [
            round(float(value), 4)
            for value in row
        ]
        for row in matrix
    ]