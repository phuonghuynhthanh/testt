"""HTTP contract for channel configuration, drafts, and explicit publishing."""

from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, model_validator

from apps.linkedin_posts.schemas import LinkedInPostAction, PexelsCandidate, UploadedMedia


class PublicationStatus(str, Enum):
    """Expose LinkedIn status independently from Blog approval state."""

    NOT_SELECTED = "NOT_SELECTED"
    DRAFT = "DRAFT"
    READY = "READY"
    PUBLISHING = "PUBLISHING"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


class LinkedInMode(str, Enum):
    """Define the explicit draft authorship choice."""

    SAME = "SAME"
    SUMMARY = "SUMMARY"
    CUSTOM = "CUSTOM"


class PublicationUpdate(BaseModel):
    """Configure the supported WEB, LINKEDIN, or WEB+LINKEDIN combinations."""

    model_config = ConfigDict(extra="forbid")
    publishWeb: bool = True
    publishLinkedin: bool = False
    linkedinMode: LinkedInMode = LinkedInMode.SAME
    linkedinIncludeWebLink: bool | None = None

    # Reject impossible channels and default Web+LinkedIn to a canonical link.
    @model_validator(mode="after")
    def validate_targets(self):
        if not self.publishWeb and not self.publishLinkedin:
            raise ValueError("at least one publication channel must be selected")
        if self.linkedinIncludeWebLink is None:
            self.linkedinIncludeWebLink = self.publishWeb and self.publishLinkedin
        if self.linkedinIncludeWebLink and not (
            self.publishWeb and self.publishLinkedin
        ):
            raise ValueError("a LinkedIn web link requires WEB + LINKEDIN")
        return self


class DraftRequest(BaseModel):
    """Request a non-publishing SAME or SUMMARY draft."""

    model_config = ConfigDict(extra="forbid")
    mode: LinkedInMode
    includeWebLink: bool = True
    regenerate: bool = False


class LinkedInContentUpdate(BaseModel):
    """Save optional administrator text edits and validated media selections."""

    model_config = ConfigDict(extra="forbid")
    content: str | None = Field(default=None, min_length=1)
    media: list[PexelsCandidate | UploadedMedia] | None = Field(default=None, max_length=20)

    # Require one actual edit and preserve exact selected-image ordering.
    @model_validator(mode="after")
    def validate_update(self):
        if self.content is None and self.media is None:
            raise ValueError("content or media must be supplied")
        if self.content is not None and not self.content.strip():
            raise ValueError("content must not be blank")
        if self.media is not None and [item.order for item in self.media] != list(
            range(1, len(self.media) + 1)
        ):
            raise ValueError("selected media order must be sequential")
        return self


class LinkedInCommandRequest(BaseModel):
    """Save reviewed Blog-derived LinkedIn content or publish it immediately."""

    model_config = ConfigDict(extra="forbid")
    mode: LinkedInMode
    content: str = Field(min_length=1)
    media: list[PexelsCandidate | UploadedMedia] = Field(default_factory=list, max_length=20)
    includeWebLink: bool = True
    factCheck: dict | None = None
    generation: dict | None = None
    action: LinkedInPostAction = LinkedInPostAction.SAVE_DRAFT

    # Preserve exact selected-image ordering before saving reviewed media.
    @model_validator(mode="after")
    def validate_command(self):
        if not self.content.strip():
            raise ValueError("content must not be blank")
        if [item.order for item in self.media] != list(range(1, len(self.media) + 1)):
            raise ValueError("selected media order must be sequential")
        return self


class MediaSuggestionRequest(BaseModel):
    """Optionally search supplied keywords instead of the persisted media plan."""

    model_config = ConfigDict(extra="forbid")
    keywords: list[str] | None = None
