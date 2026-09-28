import logging
from threading import Lock
from time import monotonic
from typing import FrozenSet, Optional

import httpx
from fastapi import HTTPException, status

from config.settings import PLATFORM_API_BASE_URL

logger = logging.getLogger(__name__)
_REQUEST_TIMEOUT_SECONDS = 3.0
_CACHE_TTL_SECONDS = 60


class PlatformCourseCatalogService:
    """Validate course IDs against Platform with a short in-memory cache."""

    _course_ids: Optional[FrozenSet[str]] = None
    _expires_at: float = 0.0
    _cache_lock = Lock()

    # Parse the public Platform course-list response into normalized IDs.
    @staticmethod
    def _parse_course_ids(payload: object) -> FrozenSet[str]:
        if not isinstance(payload, list):
            raise ValueError("Platform course catalog response must be a list")

        course_ids = {
            str(item.get("id") or "").strip()
            for item in payload
            if isinstance(item, dict) and str(item.get("id") or "").strip()
        }
        return frozenset(course_ids)

    # Fetch the authoritative published course catalog from Platform.
    @classmethod
    def _fetch_course_ids(cls) -> FrozenSet[str]:
        if not PLATFORM_API_BASE_URL:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Platform course catalog is not configured",
            )

        try:
            with httpx.Client(timeout=_REQUEST_TIMEOUT_SECONDS) as client:
                response = client.get(f"{PLATFORM_API_BASE_URL}/courses")
                response.raise_for_status()
                return cls._parse_course_ids(response.json())
        except (httpx.HTTPError, ValueError) as error:
            logger.warning("Platform course catalog request failed: %s", error)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Platform course catalog is unavailable",
            ) from error

    # Return cached course IDs or refresh the cache after its TTL expires.
    @classmethod
    def get_course_ids(cls) -> FrozenSet[str]:
        now = monotonic()
        if cls._course_ids is not None and now < cls._expires_at:
            return cls._course_ids

        with cls._cache_lock:
            now = monotonic()
            if cls._course_ids is not None and now < cls._expires_at:
                return cls._course_ids

            course_ids = cls._fetch_course_ids()
            cls._course_ids = course_ids
            cls._expires_at = now + _CACHE_TTL_SECONDS
            return course_ids

    # Reject blank or unknown course IDs before enrollment is written.
    @classmethod
    def require_course(cls, course_id: str) -> str:
        normalized_course_id = str(course_id or "").strip()
        if not normalized_course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="course_id is required",
            )
        if normalized_course_id not in cls.get_course_ids():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Course not found",
            )
        return normalized_course_id

    # Reset process-local cache state for deterministic tests.
    @classmethod
    def clear_cache(cls) -> None:
        with cls._cache_lock:
            cls._course_ids = None
            cls._expires_at = 0.0
