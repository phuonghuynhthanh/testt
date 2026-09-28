from typing import Optional, List
from pydantic import BaseModel

class BusinessInfor(BaseModel):
    id: int
    name: str
    type: str
    city: str
    district: str
    min_price: float
    max_price: float
    address: str
    description: str
    images: List[str]

class BusinessCreate(BaseModel):
    name: str
    type: str
    city: str
    district: str
    min_price: float
    max_price: float
    address: str
    description: str

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    address: Optional[str] = None
    description: Optional[str] = None
    images: Optional[List[str]] = None
