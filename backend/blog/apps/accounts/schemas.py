from typing import Any

from pydantic import BaseModel, Field


class UserSchema(BaseModel):
    user_id: str
    email: str
    role: str
    scopes: dict[str, Any] = Field(default_factory=dict)
