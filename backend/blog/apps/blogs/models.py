from uuid import uuid4
from sqlalchemy import Column, DateTime, ForeignKey, String, event
from apps.core.text import normalize_search
from config.database import FastModel
from apps.core.date_time import DateTime as CustomDateTime
from sqlalchemy.dialects.postgresql import JSON


class Blog(FastModel):
    __tablename__ = "blogs"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    tag = Column(String, nullable=False)
    title = Column(String, nullable=False)
    banner_url = Column(String, nullable=False)
    link_post = Column(String, nullable=False, unique=True)
    content = Column(String, nullable=False)
    seo = Column(JSON, nullable=False)
    category = Column(String, nullable=False, default="All")
    category_id = Column(
        String, ForeignKey("categories.id"), nullable=True, index=True
    )
    state = Column(String, nullable=False)
    search_text = Column(String, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=CustomDateTime.now)
    modified_at = Column(
        DateTime, default=CustomDateTime.now, onupdate=CustomDateTime.now
    )


# Keep the normalized search index current for all ORM persistence paths.
@event.listens_for(Blog, "before_insert")
@event.listens_for(Blog, "before_update")
def update_search_text(mapper, connection, blog):
    blog.search_text = normalize_search(
        " ".join([blog.title or "", blog.link_post or "", blog.tag or ""])
    )
