"""Database-backed Blog categories."""

from uuid import uuid4

from sqlalchemy import Column, DateTime, String

from apps.core.date_time import DateTime as CustomDateTime
from config.database import FastModel


class Category(FastModel):
    """Store reusable, recoverable Blog categories."""

    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=CustomDateTime.now)
    modified_at = Column(DateTime, default=CustomDateTime.now, onupdate=CustomDateTime.now)
    deleted_at = Column(DateTime, nullable=True)
