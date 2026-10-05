from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional
from zoneinfo import ZoneInfo

from apps.core.language import PostLanguage
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class BlogState(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class BlogCreateAction(str, Enum):
    """Make saving and immediate publication explicit commands."""

    SAVE_PENDING = "SAVE_PENDING"
    PUBLISH_NOW = "PUBLISH_NOW"


class BlogStateUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: BlogState
    modifiedAt: datetime | None = None

    # Convert offset-bearing undo timestamps into Vietnam database wall time.
    @field_validator("modifiedAt")
    @classmethod
    def normalize_modified_at(cls, value):
        if value is not None and value.tzinfo is not None:
            return value.astimezone(ZoneInfo("Asia/Ho_Chi_Minh")).replace(
                tzinfo=None
            )
        return value


class BulkStateItem(BlogStateUpdate):
    id: str = Field(min_length=1)


class BulkStateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    items: list[BulkStateItem] = Field(min_length=1, max_length=100)

    # Reject ambiguous repeated IDs before opening a transaction.
    @model_validator(mode="after")
    def unique_ids(self):
        if len({item.id for item in self.items}) != len(self.items):
            raise ValueError("Blog IDs must be unique")
        return self


class BulkIdsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ids: list[str] = Field(min_length=1, max_length=100)

    # Reject empty or repeated IDs at the request boundary.
    @field_validator("ids")
    @classmethod
    def unique_ids(cls, value):
        if any(not item.strip() for item in value) or len(set(value)) != len(
            value
        ):
            raise ValueError("Blog IDs must be non-empty and unique")
        return value


class SEOSchema(BaseModel):
    title: str
    description: str
    url: str
    keywords: List[str]
    author: Optional[str] = None
    published_time: Optional[datetime] = None
    modified_time: Optional[datetime] = None


class SEODataSchema(BaseModel):
    title: str
    description: str
    url: str
    keywords: List[str]
    author: Optional[str] = None


class SEOInputSchema(BaseModel):
    """Accept administrator-editable SEO fields only."""

    model_config = ConfigDict(extra="forbid")

    title: str
    description: str
    keywords: List[str]
    author: Optional[str] = None

    # Ignore only the retired client-owned canonical URL during migration.
    @model_validator(mode="before")
    @classmethod
    def discard_legacy_url(cls, value):
        # Allow internal callers that still pass the read-model SEO schema.
        if isinstance(value, BaseModel):
            value = value.model_dump()
        if isinstance(value, dict):
            value = dict(value)
            value.pop("url", None)
        return value


class BlogSchema(BaseModel):
    id: str
    tag: str
    title: str
    banner_url: Optional[str] = None
    link_post: str
    category: str
    created_at: datetime
    modified_at: datetime
    seo: SEODataSchema


class ListBlogAdmin(BaseModel):
    id: str
    tag: str
    title: str
    banner_url: Optional[str] = None
    link_post: str
    category: str
    state: str
    seo: SEODataSchema
    created_at: datetime
    modified_at: datetime


class ContentSchema(BaseModel):
    link_post: str
    seo: SEOSchema
    content: str
    title: str


class BlogCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tag: str
    title: str
    banner_url: Optional[str] = None
    seo: SEOInputSchema
    content: str
    category: str

    # Ignore only the retired client-owned slug during migration.
    @model_validator(mode="before")
    @classmethod
    def discard_legacy_slug(cls, value):
        if isinstance(value, dict):
            value = dict(value)
            value.pop("link_post", None)
        return value


class BlogUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tag: Optional[str] = None
    title: Optional[str] = None
    banner_url: Optional[str] = None
    seo: Optional[SEOInputSchema] = None
    content: Optional[str] = None
    category: Optional[str] = None
    state: Optional[str] = None

    # Ignore only the retired client-owned slug during migration.
    @model_validator(mode="before")
    @classmethod
    def discard_legacy_slug(cls, value):
        if isinstance(value, dict):
            value = dict(value)
            value.pop("link_post", None)
        return value


class BlogForClient(BaseModel):
    blogs: List[BlogSchema]
    next_req: Optional[str] = None


class GenerateBlogData(BaseModel):
    title: str
    category: str
    language: PostLanguage = "vietnamese"


class SearchReferencesRequest(BaseModel):
    """
    Request body cho endpoint /blog/search-references
    """

    keyword: str = Field(..., min_length=1, max_length=200)
    keywords: Optional[List[str]] = Field(
        None, description="Mảng keywords phụ để tìm thêm links"
    )
    language: Optional[Literal["vietnamese", "english"]] = "vietnamese"
    max_results: Optional[int] = Field(20, ge=1, le=50)
    exclude_ads: Optional[bool] = True
    exclude_spam: Optional[bool] = True


class LinkItem(BaseModel):
    """
    Item input cho classify-links
    """

    url: str
    title: Optional[str] = None
    snippet: Optional[str] = None


class ReferenceResult(BaseModel):
    """
    Một kết quả link tham khảo từ SERP sau khi đã phân loại
    """

    title: str
    url: str
    snippet: str
    domain: str
    position: int
    category: Literal["organic", "ad", "spam"]
    relevance_score: float = Field(..., ge=0, le=1)
    metadata: dict


class LinkReference(BaseModel):
    """
    Link reference đơn giản với tag phân loại
    """

    title: str
    url: str
    tag: Literal["NORMAL", "ADS", "SPAM"]


class ClassifyLinksRequest(BaseModel):
    links: List[LinkItem] = Field(..., min_length=1, max_length=100)


class ClassifiedLink(BaseModel):
    url: str
    category: Literal["organic", "ad", "spam", "duplicate"]
    confidence: float = Field(..., ge=0, le=1)
    reason: str
    metadata: dict


class ClassifyLinksResponse(BaseModel):
    classified_links: List[ClassifiedLink]
    summary: dict


class FetchContentRequest(BaseModel):
    """
    Request body cho endpoint /blog/fetch-content
    """

    url: str = Field(
        ..., min_length=1, description="URL cần fetch và extract nội dung"
    )
    include_metadata: Optional[bool] = Field(
        True, description="Có bao gồm metadata (author, date, etc.) hay không"
    )


class FetchContentResponse(BaseModel):
    """
    Response từ endpoint fetch-content
    """

    url: str
    title: Optional[str] = None
    content: Optional[str] = None
    text_content: Optional[str] = None  # Plain text version (no HTML)
    author: Optional[str] = None
    published_date: Optional[str] = None
    language: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    success: bool
    error_message: Optional[str] = None
