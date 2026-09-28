from sqlalchemy import JSON, Boolean, Float, Integer
import uuid
from sqlalchemy import Column, DateTime, String
from config.database import FastModel
from apps.core.date_time import DateTime as CustomDateTime


class Package(FastModel):
    __tablename__ = "packages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    highlights = Column(JSON, nullable=False)
    featured = Column(Boolean, nullable=True)
    pdf = Column(String, nullable=True)
    created_at = Column(DateTime, default=CustomDateTime.now)
    modified_at = Column(DateTime, default=CustomDateTime.now, onupdate=CustomDateTime.now)