from sqlalchemy import Column, DateTime, Integer, String
from config.database import FastModel
from apps.core.date_time import DateTime as CustomDateTime


class Expert(FastModel):
    __tablename__ = "experts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    image = Column(String, nullable=False)
    title = Column(String, nullable=False)
    experience = Column(String, nullable=False)
    category = Column(String, nullable=False)
    created_at = Column(DateTime, default=CustomDateTime.now)
    modified_at = Column(DateTime, default=CustomDateTime.now, onupdate=CustomDateTime.now)