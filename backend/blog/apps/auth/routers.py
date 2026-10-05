from fastapi import APIRouter, Request, Response

from apps.auth.schemas import LoginRequest, TokenResponse
from apps.auth.services import authenticate, create_access_token
from apps.core.rate_limit import limiter
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Exchange the configured administrator credential for a short-lived JWT.
@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(request: Request, response: Response, credentials: LoginRequest) -> TokenResponse:
    authenticate(credentials.username, credentials.password)
    return TokenResponse(
        access_token=create_access_token(settings.ADMIN_USERNAME),
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )
