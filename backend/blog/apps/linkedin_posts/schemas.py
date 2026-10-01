"""Strict, Blog-independent LinkedIn input and output contracts."""

from enum import Enum
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class StrictModel(BaseModel):
    """Reject provider or AI fields that this domain did not explicitly model."""

    model_config = ConfigDict(extra="forbid")


class LinkedInMode(str, Enum):
    """Describe how a LinkedIn draft is authored."""

    SAME = "SAME"
    SUMMARY = "SUMMARY"
    CUSTOM = "CUSTOM"


class MediaMode(str, Enum):
    """Describe the supported LinkedIn media shapes."""

    NONE = "none"
    SINGLE = "single-image"
    MULTI = "multi-image"


class LinkedInPostAction(str, Enum):
    """Make persistence-only and immediate provider publication explicit."""

    SAVE_DRAFT = "SAVE_DRAFT"
    PUBLISH_NOW = "PUBLISH_NOW"


class LinkedInPostStatus(str, Enum):
    """Represent the provider-safe standalone LinkedIn lifecycle."""

    DRAFT = "DRAFT"
    READY = "READY"
    PUBLISHING = "PUBLISHING"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


class LinkedInLinkPlacement(str, Enum):
    """Describe where the backend-owned target URL is emitted."""

    NONE = "NONE"
    IN_POST = "IN_POST"
    FIRST_COMMENT = "FIRST_COMMENT"


class LinkedInCommentStatus(str, Enum):
    """Track the independent first-comment side effect."""

    NOT_REQUESTED = "NOT_REQUESTED"
    PENDING = "PENDING"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


# Translate one retired boolean field into the authoritative placement field.
def translate_legacy_link_flag(value, target_key: str, *legacy_keys: str):
    if not isinstance(value, dict):
        return value
    value = dict(value)
    legacy_key = next((key for key in legacy_keys if key in value), None)
    if not legacy_key:
        return value
    expected = "IN_POST" if bool(value.pop(legacy_key)) else "NONE"
    if target_key in value and value[target_key] != expected:
        raise ValueError(f"{legacy_key} conflicts with {target_key}")
    value.setdefault(target_key, expected)
    return value


class LinkedInSourceType(str, Enum):
    """Describe origin without coupling a post to a Blog."""

    INDEPENDENT_AI = "INDEPENDENT_AI"
    BLOG_ADAPTATION = "BLOG_ADAPTATION"
    CUSTOM = "CUSTOM"


class ImagePlan(StrictModel):
    """Describe a reviewable image suggestion from the structured generator."""

    slotId: str = Field(min_length=1)
    order: int = Field(ge=1)
    role: str = Field(min_length=1)
    preferredSource: Literal["internal", "pexels", "generated"]
    concept: str = Field(min_length=1)
    searchKeywords: list[str] = Field(min_length=2, max_length=3)
    altTextDraft: str = Field(min_length=1, max_length=4086)


class MediaPlan(StrictModel):
    """Keep media selection separate from the immutable Blog banner."""

    mode: MediaMode
    images: list[ImagePlan]

    # Enforce LinkedIn's supported image cardinalities before a provider request.
    @model_validator(mode="after")
    def validate_images(self):
        expected = {
            MediaMode.NONE: (0, 0),
            MediaMode.SINGLE: (1, 1),
            MediaMode.MULTI: (2, 20),
        }[self.mode]
        if not expected[0] <= len(self.images) <= expected[1]:
            raise ValueError(f"media.images does not match {self.mode.value}")
        if [image.order for image in self.images] != list(
            range(1, len(self.images) + 1)
        ):
            raise ValueError("media image order must be sequential")
        if len({image.slotId for image in self.images}) != len(self.images):
            raise ValueError("media image slot IDs must be unique")
        return self


class Connection(StrictModel):
    """Represent the one intended STEM-to-quant connection."""

    from_: str = Field(alias="from", min_length=1)
    to: str = Field(min_length=1)


class GeneratedPost(StrictModel):
    """Validate Gemini's structured LinkedIn draft before persisting it."""

    style: Literal[
        "relatable-memory",
        "one-liner",
        "technical-analogy",
        "question-first",
        "mini-problem",
        "contrarian",
        "short-story",
        "school-vs-market",
        "developer-pain",
        "observation",
    ]
    openingType: Literal[
        "question", "memory", "statement", "contrast", "problem", "story", "one-liner"
    ]
    audience: Literal[
        "math",
        "competitive-programming",
        "software-engineering",
        "machine-learning",
        "systems",
        "mixed",
    ]
    hookSource: str = Field(min_length=1)
    connection: Connection
    insight: str = Field(min_length=1)
    content: str = Field(min_length=1)
    hashtags: list[str] = Field(default_factory=list, max_length=4)
    media: MediaPlan
    requiresHumanFactCheck: bool
    factCheckNotes: list[str]

    # Infer the source project's legacy opening type before strict validation.
    @model_validator(mode="before")
    @classmethod
    def infer_opening_type(cls, value):
        if isinstance(value, dict) and "openingType" not in value:
            inferred = {
                "relatable-memory": "memory",
                "one-liner": "one-liner",
                "question-first": "question",
                "mini-problem": "problem",
                "contrarian": "contrast",
                "short-story": "story",
                "school-vs-market": "contrast",
            }
            value = {
                **value,
                "openingType": inferred.get(value.get("style"), "statement"),
            }
        return value

    # Keep factual-review flags internally consistent and normalize canonical hashtags.
    @model_validator(mode="after")
    def validate_post(self):
        import re

        if self.requiresHumanFactCheck != bool(self.factCheckNotes):
            raise ValueError("requiresHumanFactCheck must match factCheckNotes")
        self.content = re.sub(
            "\u0009ext\\{([^{}\\r\\n]*)\\}",
            lambda match: match.group(1).strip(),
            self.content,
        )
        if any(
            (ord(char) < 32 and char not in "\n\r") or 127 <= ord(char) <= 159
            for char in self.content
        ):
            raise ValueError("content must not contain control characters")
        content_hashtags = re.findall(
            r"(?<!\w)#[^\W_][\w]*", self.content, flags=re.UNICODE
        )
        self.content = re.sub(
            r"(?<!\w)#[^\W_][\w]*", "", self.content, flags=re.UNICODE
        )
        self.content = re.sub(r" +(?=\r?$)", "", self.content, flags=re.MULTILINE)
        self.content = re.sub(r" {2,}", " ", self.content).strip()
        if not self.content:
            raise ValueError("content must contain text besides hashtags")
        normalized = []
        for tag in ["#VietQuant", *content_hashtags, *self.hashtags]:
            clean = "#" + "".join(
                char for char in tag.lstrip("#") if char.isalnum() or char == "_"
            )
            if clean != "#" and clean.casefold() not in {
                item.casefold() for item in normalized
            }:
                normalized.append(clean)
        if not 1 <= len(normalized) <= 4:
            raise ValueError("hashtags must contain 1 to 4 unique values")
        self.hashtags = normalized
        return self


class FactualReview(StrictModel):
    """Capture independent factual review without rewriting content."""

    requiresHumanFactCheck: bool
    factCheckNotes: list[str]

    # Require a review flag whenever the reviewer has left notes.
    @model_validator(mode="after")
    def validate_review(self):
        if self.requiresHumanFactCheck != bool(self.factCheckNotes):
            raise ValueError("requiresHumanFactCheck must match factCheckNotes")
        return self


class RecentPost(StrictModel):
    """Carry only the structured history needed by diversity validation."""

    topic: str = ""
    providerPostId: str | None = None
    content: str = ""
    style: str = ""
    openingType: str = ""
    hookSource: str = ""
    connection: str = ""
    opening: str = ""
    cta: str = ""
    publishedAt: datetime | None = None


class LinkedInArticleSource(StrictModel):
    """Neutral input passed from publications without importing the Blog domain."""

    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    category: str = Field(min_length=1)
    tags: list[str] = Field(default_factory=list)
    canonicalUrl: str | None = None
    mode: LinkedInMode
    recentPosts: list[RecentPost] = Field(default_factory=list, max_length=5)


class PexelsCandidate(StrictModel):
    """Safe Pexels metadata saved as selected publication media."""

    provider: Literal["pexels"] = "pexels"
    providerId: str
    sourceUrl: str
    imageUrl: str
    photographer: str
    attribution: str
    altText: str = Field(min_length=1, max_length=4086)
    order: int = Field(default=1, ge=1)


class UploadedMedia(StrictModel):
    """Reference an administrator upload stored under the LinkedIn prefix."""

    provider: Literal["upload"] = "upload"
    origin: Literal["manual", "cloudflare-ai"] = "manual"
    objectKey: str = Field(pattern=r"^linkedin/[^/]+$")
    fileName: str = Field(min_length=1, max_length=255)
    altText: str = Field(min_length=1, max_length=4086)
    order: int = Field(default=1, ge=1)


class ValidatedImage(StrictModel):
    """Represent byte-validated image input for an upload request."""

    media_type: Literal["image/png", "image/jpeg", "image/gif"]
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    bytes: bytes


class OrganizationVerification(StrictModel):
    """Return organization readiness without leaking access credentials."""

    identity: dict
    organization: dict
    roles: list[dict]
    scopes: list[str]
    permissions: dict
    readyForOrganicPosting: bool


class DraftResult(StrictModel):
    """Persistable draft details returned by the adaptation service."""

    content: str
    media: MediaPlan
    factualReview: FactualReview
    generated: GeneratedPost | None = None


class IndependentDraftRequest(StrictModel):
    """Request an independent LinkedIn preview without a Blog reference."""

    topic: str = Field(min_length=1)
    context: str = ""
    targetAudience: str | None = Field(default=None, max_length=300)
    requestedMediaMode: MediaMode = MediaMode.NONE

    # Normalize an empty hybrid audience control to backend inference.
    @field_validator("targetAudience")
    @classmethod
    def normalize_target_audience(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class TopicProposalRequest(StrictModel):
    """Request bounded, non-persistent AI topic suggestions."""

    count: int = Field(default=3, ge=1, le=10)
    recentLimit: int = Field(default=20, ge=5, le=50)
    targetAudience: str | None = Field(default=None, max_length=300)
    guideline: str = ""

    # Normalize an empty hybrid audience control to backend inference.
    @field_validator("targetAudience")
    @classmethod
    def normalize_target_audience(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class LinkedInPostCreate(StrictModel):
    """Accept reviewed AI or manual content for saving or direct publication."""

    content: str = Field(min_length=1)
    topic: str | None = None
    mediaMode: MediaMode = MediaMode.NONE
    media: list[PexelsCandidate | UploadedMedia] = Field(default_factory=list, max_length=20)
    factCheck: dict | None = None
    generation: dict | None = None
    sourceType: LinkedInSourceType = LinkedInSourceType.CUSTOM
    linkPlacement: LinkedInLinkPlacement = LinkedInLinkPlacement.NONE
    action: LinkedInPostAction = LinkedInPostAction.SAVE_DRAFT

    # Translate the retired boolean without accepting conflicting client intent.
    @model_validator(mode="before")
    @classmethod
    def translate_legacy_link_flag(cls, value):
        return translate_legacy_link_flag(
            value, "linkPlacement", "includeWebLink", "linkedinIncludeWebLink"
        )


class LinkedInPostUpdate(StrictModel):
    """Permit reviewed-content edits only before irreversible publication."""

    topic: str | None = Field(default=None, min_length=1)
    content: str | None = Field(default=None, min_length=1)
    mediaMode: MediaMode | None = None
    media: list[PexelsCandidate | UploadedMedia] | None = Field(default=None, max_length=20)
    factCheck: dict | None = None
    generation: dict | None = None
    sourceType: LinkedInSourceType | None = None
    linkPlacement: LinkedInLinkPlacement | None = None

    # Translate legacy placement booleans before strict update validation.
    @model_validator(mode="before")
    @classmethod
    def translate_legacy_link_flag(cls, value):
        return translate_legacy_link_flag(
            value, "linkPlacement", "includeWebLink", "linkedinIncludeWebLink"
        )


# Strip Markdown-only syntax while preserving paragraphs for SAME mode.
def linkedin_plain_text(value: str) -> str:
    """Adapt trusted article formatting without pretending it is a new summary."""
    import re

    value = re.sub(r"!?(?:\[[^\]]*\])\(([^)]+)\)", r"\1", value)
    value = re.sub(r"^\s{0,3}#{1,6}\s+", "", value, flags=re.MULTILINE)
    value = re.sub(r"[*_`]+", "", value)
    return re.sub(r"\n{3,}", "\n\n", value).strip()
