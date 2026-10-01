"""Blog-to-LinkedIn adaptation with source-proven generation guardrails."""

import json
from pathlib import Path

from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.schemas import (
    DraftResult,
    FactualReview,
    GeneratedPost,
    LinkedInArticleSource,
    LinkedInMode,
    MediaMode,
    MediaPlan,
    linkedin_plain_text,
)
from apps.linkedin_posts.services.gemini import GeminiLinkedInProvider

MAX_ATTEMPTS = 4
MAX_SAME_CONTENT = 3000
PROMPTS = Path(__file__).resolve().parents[1] / "prompts"


# Read bundled prompts locally so CMS requests never depend on source-repository paths.
def _prompt(name: str) -> str:
    return (PROMPTS / name).read_text(encoding="utf-8")


# Fill the proven template without changing any wording in the bundled prompt.
def _generation_prompt(source: LinkedInArticleSource, **overrides: str) -> str:
    replacements = {
        "topic": source.title,
        "context": "Adapt the trusted Blog article supplied above while preserving its central insight.",
        "targetAudience": "Infer the most suitable audience from topic, context, VietQuant guidance, and recent feed history.",
        "preferredConnection": "",
        "visualHint": "",
        "sourceNotes": "[]",
        "publishAt": "",
        "requestedMediaMode": "",
        "recentPosts": json.dumps(
            [post.model_dump(mode="json") for post in source.recentPosts],
            ensure_ascii=False,
            default=str,
        ),
    }
    replacements.update(overrides)
    template = _prompt("generation.md")
    for key, value in replacements.items():
        template = template.replace(f"{{{{{key}}}}}", value)
    return template


# Add a canonical web CTA deterministically rather than asking an AI to invent URLs.
def append_canonical_link(content: str, canonical_url: str | None) -> str:
    if not canonical_url or canonical_url in content:
        return content.strip()
    return f"{content.strip()}\n\nĐọc bài đầy đủ:\n{canonical_url}"


# Render the final publishable text exactly as the proven source workflow does.
def render_generated_post(post: GeneratedPost, canonical_url: str | None = None) -> str:
    return "\n\n".join(
        part
        for part in [
            append_canonical_link(post.content, canonical_url),
            " ".join(post.hashtags),
        ]
        if part
    )


# Flag source-style absolute wording even if an independent reviewer misses it.
def _absolute_notes(content: str) -> list[str]:
    import re

    words = sorted(
        set(
            re.findall(
                r"(?<!\w)(luôn|y hệt|chắc chắn|sẽ|ngay lập tức|hoàn hảo)(?!\w)",
                content,
                flags=re.IGNORECASE,
            )
        )
    )
    return [
        f'Review absolute wording "{word}"; qualify unsupported technical, market, equivalence, or causal claims.'
        for word in words
    ]


# Normalize Vietnamese comparison values for diversity checks.
def _normalized(value: str) -> str:
    return " ".join(value.strip().casefold().split())


# Enforce source-brand and deterministic-link guardrails after structured model validation.
def _validate_generated_content(
    post: GeneratedPost, source: LinkedInArticleSource
) -> None:
    import re

    paragraphs = [
        part.strip()
        for part in re.split(r"\r?\n\s*\r?\n", post.content)
        if part.strip()
    ]
    ending = paragraphs[-1] if paragraphs else ""
    if (
        len(paragraphs) < 2
        or "\n" in ending
        or not re.search(r"\bvietquant\b", ending, re.IGNORECASE)
        or not re.search(
            r"(?:\?|follow|theo dõi|hãy|cùng|tham gia|tìm hiểu|đọc thêm|chia sẻ|trao đổi|kết nối|ứng tuyển)",
            ending,
            re.IGNORECASE,
        )
    ):
        raise LinkedInError(
            "invalid_response",
            "Generated draft must end with a standalone VietQuant CTA.",
        )
    if re.search(
        r"team quant số 1 việt nam", post.content, re.IGNORECASE
    ) and not re.search(
        r"(?:mục tiêu|khát vọng|trên hành trình|hướng tới).{0,160}team quant số 1 việt nam|team quant số 1 việt nam.{0,160}(?:mục tiêu|khát vọng|trên hành trình|hướng tới)",
        post.content,
        re.IGNORECASE | re.DOTALL,
    ):
        raise LinkedInError(
            "invalid_response",
            "The team quant số 1 Việt Nam claim must be framed as an aspiration.",
        )
    if re.search(r"https?://", post.content, re.IGNORECASE):
        raise LinkedInError(
            "invalid_response",
            "The generator must not invent URLs; canonical links are appended by the server.",
        )
    if len(source.content) > 1000 and len(post.content) >= len(source.content) * 0.85:
        raise LinkedInError(
            "invalid_response",
            "SUMMARY must be a semantic LinkedIn summary, not a near-complete article copy.",
        )
    opening = next(
        (line.strip() for line in post.content.splitlines() if line.strip()), ""
    )
    cta = next(
        (line.strip() for line in reversed(post.content.splitlines()) if line.strip()),
        "",
    )
    connection = f"{post.connection.from_} -> {post.connection.to}"
    latest = source.recentPosts[0] if source.recentPosts else None
    if latest and _normalized(latest.hookSource) == _normalized(post.hookSource):
        raise LinkedInError(
            "invalid_response", "Generated draft repeats the latest hook source."
        )
    if (
        sum(item.openingType == post.openingType for item in source.recentPosts[:4])
        >= 2
    ):
        raise LinkedInError(
            "invalid_response",
            "Generated draft repeats an opening type more than twice in the latest five posts.",
        )
    if any(
        _normalized(item.connection) == _normalized(connection)
        for item in source.recentPosts[:2]
    ):
        raise LinkedInError(
            "invalid_response", "Generated draft repeats a recent connection."
        )
    if (
        opening
        and sum(
            _normalized(item.opening) == _normalized(opening)
            for item in source.recentPosts
        )
        >= 2
    ):
        raise LinkedInError(
            "invalid_response", "Generated draft repeats a recent opening too often."
        )
    if cta and any(
        _normalized(item.cta) == _normalized(cta) for item in source.recentPosts
    ):
        raise LinkedInError("invalid_response", "Generated draft repeats a recent CTA.")


class LinkedInDraftGenerator:
    """Create a reviewable SAME or SUMMARY draft; CUSTOM is intentionally never generated."""

    # Own only the Gemini implementation and never receive a Blog model.
    def __init__(self, provider: GeminiLinkedInProvider) -> None:
        self.provider = provider

    # Adapt trusted article content with no creative rewrite for SAME mode.
    async def same(self, source: LinkedInArticleSource) -> DraftResult:
        content = linkedin_plain_text(source.content)
        if len(content) > MAX_SAME_CONTENT:
            raise LinkedInError(
                "invalid_input",
                "Blog content is too long for SAME mode; use SUMMARY instead.",
            )
        if not any(tag.casefold() == "#vietquant" for tag in content.split()):
            content = f"{content}\n\n#VietQuant"
        return DraftResult(
            content=content,
            media=MediaPlan(mode=MediaMode.NONE, images=[]),
            factualReview=FactualReview(
                requiresHumanFactCheck=bool(_absolute_notes(content)),
                factCheckNotes=_absolute_notes(content),
            ),
        )

    # Generate, validate, and independently fact-review a semantic SUMMARY draft.
    async def summary(self, source: LinkedInArticleSource) -> DraftResult:
        prompt = _prompt("adapt_blog.md").format(
            title=source.title,
            content=source.content,
            category=source.category,
            tags=", ".join(source.tags),
            canonical_url="(link placement occurs only at publish time)",
            mode=source.mode.value,
        )
        last_error = None
        for _ in range(MAX_ATTEMPTS):
            try:
                post = await self.provider.generate(
                    _prompt("system.md"), prompt + "\n\n" + _generation_prompt(source)
                )
                _validate_generated_content(post, source)
                review = await self.provider.review(post)
                notes = list(
                    dict.fromkeys(
                        [
                            *post.factCheckNotes,
                            *review.factCheckNotes,
                            *_absolute_notes(post.content),
                        ]
                    )
                )
                post = post.model_copy(
                    update={
                        "requiresHumanFactCheck": bool(notes),
                        "factCheckNotes": notes,
                    }
                )
                return DraftResult(
                    content=render_generated_post(post),
                    media=post.media,
                    factualReview=FactualReview(
                        requiresHumanFactCheck=bool(notes), factCheckNotes=notes
                    ),
                    generated=post,
                )
            except LinkedInError as error:
                last_error = error
                if error.code not in {"invalid_response"}:
                    raise
        raise LinkedInError(
            "generation_failed",
            f"LinkedIn generation failed after {MAX_ATTEMPTS} attempts: {last_error}",
            attempts=MAX_ATTEMPTS,
        )

    # Route the selected mode without ever replacing administrator-owned CUSTOM text.
    async def draft(self, source: LinkedInArticleSource) -> DraftResult:
        if source.mode is LinkedInMode.CUSTOM:
            raise LinkedInError(
                "invalid_input", "CUSTOM drafts must be supplied by an administrator."
            )
        return (
            await self.same(source)
            if source.mode is LinkedInMode.SAME
            else await self.summary(source)
        )

    # Generate an independent post with the proven generation prompt, never adapt_blog.md.
    async def independent(
        self,
        topic: str,
        context: str,
        audience: str | None,
        media_mode: str,
        recent_posts: list[dict],
    ) -> DraftResult:
        source = LinkedInArticleSource(
            title=topic,
            content=context or topic,
            category="INDEPENDENT",
            mode=LinkedInMode.SUMMARY,
            recentPosts=recent_posts,
        )
        prompt = _generation_prompt(
            source,
            context=context or "Create an original LinkedIn post about this topic.",
            targetAudience=audience or "Infer the most suitable audience from topic, context, VietQuant guidance, and recent feed history.",
            requestedMediaMode=media_mode,
        )
        last_error = None
        for _ in range(MAX_ATTEMPTS):
            try:
                post = await self.provider.generate(_prompt("system.md"), prompt)
                _validate_generated_content(post, source)
                review = await self.provider.review(post)
                notes = list(
                    dict.fromkeys(
                        [
                            *post.factCheckNotes,
                            *review.factCheckNotes,
                            *_absolute_notes(post.content),
                        ]
                    )
                )
                post = post.model_copy(
                    update={
                        "requiresHumanFactCheck": bool(notes),
                        "factCheckNotes": notes,
                    }
                )
                return DraftResult(
                    content=render_generated_post(post),
                    media=post.media,
                    factualReview=FactualReview(
                        requiresHumanFactCheck=bool(notes), factCheckNotes=notes
                    ),
                    generated=post,
                )
            except LinkedInError as error:
                last_error = error
                if error.code != "invalid_response":
                    raise
        raise LinkedInError(
            "generation_failed",
            f"LinkedIn generation failed after {MAX_ATTEMPTS} attempts: {last_error}",
            attempts=MAX_ATTEMPTS,
        )
