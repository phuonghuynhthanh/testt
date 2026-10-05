"""Shared per-IP rate limits for the CMS API."""

import logging
import os

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from apps.core.errors import STATUS_MESSAGES
from config import settings


# Trust forwarded addresses only behind an explicitly configured reverse proxy.
def client_ip(request: Request) -> str:
    if settings.RATE_LIMIT_TRUST_PROXY:
        forwarded = request.headers.get("X-Forwarded-For", "").split(",", 1)[0].strip()
        if forwarded:
            return forwarded
    return request.client.host if request.client else "127.0.0.1"


# ponytail: memory storage is per process; use Redis before adding workers or replicas.
limiter = Limiter(
    key_func=client_ip,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    enabled=settings.RATE_LIMIT_ENABLED,
    headers_enabled=True,
    storage_uri=settings.RATE_LIMIT_STORAGE_URI,
    key_style="endpoint",
)


# Preserve SlowAPI retry headers while returning the shared Vietnamese error contract.
def rate_limit_exceeded_handler(request: Request, error: RateLimitExceeded) -> JSONResponse:
    response = _rate_limit_exceeded_handler(request, error)
    return JSONResponse(
        status_code=429,
        content={"detail": STATUS_MESSAGES[429]},
        headers={
            key: value for key, value in response.headers.items()
            if key not in {"content-length", "content-type"}
        },
    )


# Warn at import time when per-process counters would be multiplied by several workers.
if settings.RATE_LIMIT_ENABLED and settings.RATE_LIMIT_STORAGE_URI.startswith("memory://") and int(os.getenv("WEB_CONCURRENCY", "1") or 1) > 1:
    logging.getLogger(__name__).warning("RATE_LIMIT_STORAGE_URI=memory:// with multiple workers; limits are per worker. Use Redis.")
