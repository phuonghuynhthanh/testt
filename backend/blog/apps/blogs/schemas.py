from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class BlogState(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class BlogCategory(str, Enum):
    INVESTMENT_INSIGHTS = "INVESTMENT_INSIGHTS"
    FOREIGN_INVESTMENT = "FOREIGN_INVESTMENT"
    KNOWLEDGE = "KNOWLEDGE_BASE"
    TUTORIALS = "TUTORIALS"
    CAREER = "CAREER"
    NEWS = "NEWS"


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


class BlogSchema(BaseModel):
    id: str
    tag: str
    title: str
    banner_url: Optional[str] = None
    link_post: str
    category: BlogCategory
    created_at: datetime
    modified_at: datetime
    seo: SEODataSchema


class ListBlogAdmin(BaseModel):
    id: str
    tag: str
    title: str
    banner_url: Optional[str] = None
    link_post: str
    category: BlogCategory
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
    tag: str
    title: str
    banner_url: Optional[str] = None
    link_post: str
    seo: SEODataSchema
    content: str
    category: BlogCategory


class BlogUpdate(BaseModel):
    tag: Optional[str] = None
    title: Optional[str] = None
    banner_url: Optional[str] = None
    link_post: Optional[str] = None
    seo: Optional[SEODataSchema] = None
    content: Optional[str] = None
    category: Optional[BlogCategory] = None
    state: Optional[str] = None


class BlogForClient(BaseModel):
    blogs: List[BlogSchema]
    next_req: Optional[str] = None


class GenerateBlogData(BaseModel):
    title: str
    category: str


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

    url: str = Field(..., min_length=1, description="URL cần fetch và extract nội dung")
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
