from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import Column, DateTime, Float, Integer, String
from config.database import FastModel
from apps.core.date_time import DateTime as CustomDateTime


class Business(FastModel):
    __tablename__ = "businesses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    type = Column(String, nullable=False)
    city = Column(String, nullable=False)
    district = Column(String, nullable=False)
    min_price = Column(Float, nullable=False)
    max_price = Column(Float, nullable=False)
    address = Column(String, nullable=False)
    description = Column(String, nullable=False)
    images = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=CustomDateTime.now)
    modified_at = Column(DateTime, default=CustomDateTime.now, onupdate=CustomDateTime.now)
