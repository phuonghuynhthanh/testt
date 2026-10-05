"""Shared accent-insensitive search normalization."""

import unicodedata


# Fold Vietnamese accents and retain literal search punctuation.
def normalize_search(value: str) -> str:
    value = unicodedata.normalize(
        "NFD", value.casefold().replace("đ", "d").replace("Đ", "D")
    )
    return "".join(char for char in value if not unicodedata.combining(char))
