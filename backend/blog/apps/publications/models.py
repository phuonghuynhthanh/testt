"""Persistent per-Blog publication configuration and provider history."""

from uuid import uuid4

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, String

from apps.core.date_time import DateTime as CustomDateTime
from config.database import FastModel


class BlogPublication(FastModel):
    """Store independent web and LinkedIn channel state for one Blog."""

    __tablename__ = "post_publications"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    blog_id = Column(
        String,
        ForeignKey("blogs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    publish_web = Column(Boolean, nullable=False, default=True)
    publish_linkedin = Column(Boolean, nullable=False, default=False)
    linkedin_mode = Column(String, nullable=False, default="SAME")
    linkedin_content = Column(String, nullable=True)
    linkedin_link_placement = Column(String, nullable=False, default="NONE", server_default="NONE")
    linkedin_include_web_link = Column(Boolean, nullable=False, default=False)
    linkedin_record_id = Column(
        String, ForeignKey("linkedin_posts.id"), nullable=True, unique=True
    )
    linkedin_status = Column(String, nullable=False, default="NOT_SELECTED")
    linkedin_post_id = Column(String, nullable=True)
    linkedin_published_at = Column(DateTime, nullable=True)
    linkedin_error = Column(JSON, nullable=True)
    linkedin_media = Column(JSON, nullable=True)
    linkedin_fact_check = Column(JSON, nullable=True)
    linkedin_generation = Column(JSON, nullable=True)
    linkedin_manually_edited = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=CustomDateTime.now)
    modified_at = Column(
        DateTime, default=CustomDateTime.now, onupdate=CustomDateTime.now
    )
