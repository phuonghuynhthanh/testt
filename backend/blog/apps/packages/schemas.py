from enum import Enum
from typing import Optional, List
from pydantic import BaseModel

class PackageSchema(BaseModel):
    id: int
    title: str
    price: float
    description: str
    highlights: List[str]
    featured: bool
    pdf: Optional[str] = None

class PackageFullInfo(BaseModel):
    id: int
    title: str
    price: float
    description: str
    highlights: List[str]
    featured: bool
    pdf: Optional[str] = None
    created_at: str
    modified_at: str

class CreatePackageSchema(BaseModel):
    id: Optional[int] = None
    title: str
    price: float
    description: str
    highlights: List[str]
    featured: bool
    pdf: Optional[str] = None

class UpdatePackageSchema(BaseModel):
    title: Optional[str]
    price: Optional[float]
    description: Optional[str]
    highlights: Optional[List[str]]
    featured: Optional[bool]
    pdf: Optional[str] = None