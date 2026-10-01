"""Standalone persisted LinkedIn content, independent of Blog ownership."""

from uuid import uuid4

from sqlalchemy import JSON, Boolean, Column, DateTime, String

from apps.core.date_time import DateTime as CustomDateTime
from config.database import FastModel


class LinkedInPost(FastModel):
    """Store reviewed LinkedIn content and its durable provider outcome."""

    __tablename__ = "linkedin_posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    content = Column(String, nullable=False)
    topic = Column(String, nullable=True)
    media_mode = Column(String, nullable=False, default="none")
    media = Column(JSON, nullable=False, default=list)
    fact_check = Column(JSON, nullable=True)
    generation = Column(JSON, nullable=True)
    source_type = Column(String, nullable=False, default="CUSTOM")
    link_placement = Column(String, nullable=False, default="NONE", server_default="NONE")
    status = Column(String, nullable=False, default="DRAFT", index=True)
    provider_post_id = Column(String, nullable=True, unique=True)
    published_link_url = Column(String, nullable=True)
    link_comment_status = Column(String, nullable=False, default="NOT_REQUESTED", server_default="NOT_REQUESTED")
    provider_comment_id = Column(String, nullable=True)
    link_comment_error = Column(JSON, nullable=True)
    link_comment_published_at = Column(DateTime, nullable=True)
    published_at = Column(DateTime, nullable=True)
    last_error = Column(JSON, nullable=True)
    manually_edited = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=CustomDateTime.now)
    modified_at = Column(
        DateTime, default=CustomDateTime.now, onupdate=CustomDateTime.now
    )
