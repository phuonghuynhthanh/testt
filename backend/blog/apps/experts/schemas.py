from enum import Enum
from typing import Optional, List
from pydantic import BaseModel


class CategoryEnum(str, Enum):
    BOT_TRADING = "Legal"
    ALGO_STRATEGY = "Tax"
    PYTHON_TECH = "Accounting"
    CASE_STUDY = "Compliance"

class ExpertInfor(BaseModel):
    id: int
    name: str
    image: str
    title: str
    experience: str
    category: CategoryEnum

class ExpertCreate(BaseModel):
    name: str
    title: str
    experience: str
    category: CategoryEnum

class ExpertUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None
    experience: Optional[str] = None
    category: Optional[CategoryEnum] = None