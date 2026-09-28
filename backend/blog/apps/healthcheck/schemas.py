from pydantic import BaseModel


class HealthResponseSchema(BaseModel):
    health: str
