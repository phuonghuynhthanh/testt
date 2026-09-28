from sqlalchemy import Enum
import uuid
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import Column, DateTime, String
from apps.investments import schemas
from config.database import FastModel
from apps.core.date_time import DateTime as CustomDateTime


class Investment(FastModel):
    __tablename__ = "investments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    businessName = Column(String, nullable=False)
    city = Column(String, nullable=False)
    district = Column(String, nullable=True)
    fullAddress = Column(String, nullable=True)
    proposal = Column(JSON, nullable=False)
    status = Column(
        Enum(schemas.InvestmentStatus, name="investment_status", create_type=True),
        nullable=False, 
        default=schemas.InvestmentStatus.PENDING,
    )
    createdAt = Column(DateTime, default=CustomDateTime.now)
    modifiedAt = Column(DateTime, default=CustomDateTime.now, onupdate=CustomDateTime.now)