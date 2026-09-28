from fastapi import APIRouter

from .schemas import HealthResponseSchema

router = APIRouter(prefix="", tags=["Healthcheck"])


@router.get("/")
async def status() -> HealthResponseSchema:
    return {"health": "ok"}
