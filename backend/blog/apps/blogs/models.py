from uuid import uuid4
from sqlalchemy import Column, DateTime, String
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
    state = Column(String, nullable=False)
    created_at = Column(DateTime, default=CustomDateTime.now)
    modified_at = Column(DateTime, default=CustomDateTime.now, onupdate=CustomDateTime.now)