"""Contracts for server-owned AI image generation."""

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AIImagePurpose(str, Enum):
    """Describe the destination workflow without exposing provider details."""

    BLOG_BANNER = "BLOG_BANNER"
    LINKEDIN = "LINKEDIN"


class AIImageAspectRatio(str, Enum):
    """Restrict generation to the intentionally supported layouts."""

    WIDE = "16:9"
    SQUARE = "1:1"
    PORTRAIT = "4:5"
    STANDARD = "4:3"


class AIImageQuality(str, Enum):
    """Map reviewable quality choices to model-safe inference settings."""

    FAST = "FAST"
    BALANCED = "BALANCED"
    HIGH = "HIGH"


class AIImageGenerateRequest(BaseModel):
    """Validate a bounded administrator image-generation request."""

    model_config = ConfigDict(extra="forbid")

    purpose: AIImagePurpose
    prompt: str | None = Field(default=None, max_length=2000)
    context: str | None = Field(default=None, max_length=1000)
    negativePrompt: str | None = Field(default=None, max_length=1000)
    aspectRatio: AIImageAspectRatio = AIImageAspectRatio.WIDE
    size: Literal["1K"] = "1K"
    quality: AIImageQuality = AIImageQuality.FAST
    altText: str | None = Field(default=None, max_length=4086)

    # Normalize text and reject empty requests before provider billing.
    @model_validator(mode="after")
    def validate_prompt(self):
        self.prompt = (self.prompt or "").strip() or None
        self.context = (self.context or "").strip() or None
        self.negativePrompt = (self.negativePrompt or "").strip() or None
        self.altText = (self.altText or "").strip() or None
        if not self.prompt and not self.context:
            raise ValueError("prompt or context is required")
        return self
