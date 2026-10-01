"""Shared output-language contract for AI authoring."""

from typing import Literal

PostLanguage = Literal["vietnamese", "english"]


# Override the source language with the selected output language.
def language_instruction(language: PostLanguage) -> str:
    return (
        f"Write all generated copy in {language}, "
        "including headings, quotes, CTA, SEO descriptions and keywords. "
        "The selected output language overrides the language of the title, "
        "context and source article. Preserve proper names "
        "and technical identifiers."
    )
