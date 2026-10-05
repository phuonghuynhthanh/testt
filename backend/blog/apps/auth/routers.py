from fastapi import APIRouter, Depends, Request, Response

from apps.auth.schemas import LoginRequest, TokenResponse
from apps.auth.services import authenticate, create_access_token, require_admin
from apps.core.rate_limit import limiter
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Return the configured profile for the authenticated administrator.
@router.get("/me")
def current_admin(username: str = Depends(require_admin)):
    return {
        "username": username,
        "name": settings.ADMIN_DISPLAY_NAME or username,
        "email": settings.ADMIN_EMAIL or username,
    }


# Acknowledge client-side JWT removal without persisting server sessions.
@router.post("/logout", status_code=204)
def logout(_: str = Depends(require_admin)):
    return Response(status_code=204)


# Exchange the configured administrator credential for a short-lived JWT.
@router.post("/login", response_model=TokenResponse)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
def login(
    request: Request, response: Response, credentials: LoginRequest
) -> TokenResponse:
    authenticate(credentials.username, credentials.password)
    return TokenResponse(
        access_token=create_access_token(settings.ADMIN_USERNAME),
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )
