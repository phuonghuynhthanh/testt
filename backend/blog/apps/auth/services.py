from datetime import datetime, timedelta, timezone
from hmac import compare_digest

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash

from config import settings

bearer_scheme = HTTPBearer(auto_error=False)
password_hash = PasswordHash.recommended()
invalid_credentials = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


# Reject incomplete settings instead of supplying insecure defaults.
def _validate_settings() -> None:
    if not all(
        (
            settings.ADMIN_USERNAME,
            settings.ADMIN_PASSWORD_HASH,
            settings.JWT_SECRET,
        )
    ):
        raise RuntimeError(
            "ADMIN_USERNAME, ADMIN_PASSWORD_HASH, and JWT_SECRET "
            "must be configured"
        )
    if (
        settings.JWT_ALGORITHM != "HS256"
        or settings.JWT_EXPIRE_MINUTES <= 0
        or len(settings.JWT_SECRET) < 32
    ):
        raise RuntimeError(
            "JWT_SECRET must be at least 32 characters; use HS256 "
            "and a positive expiry"
        )


# Verify the admin password without exposing which field failed.
def authenticate(username: str, password: str) -> None:
    _validate_settings()
    username_matches = compare_digest(
        username.encode(), settings.ADMIN_USERNAME.encode()
    )
    password_matches = password_hash.verify(
        password, settings.ADMIN_PASSWORD_HASH
    )
    if not username_matches or not password_matches:
        raise invalid_credentials


# Issue the only token type accepted by the CMS administration APIs.
def create_access_token(username: str) -> str:
    _validate_settings()
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": username,
            "iat": now,
            "exp": now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES),
            "type": "admin",
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


# Require a valid, unexpired standalone CMS administration JWT.
def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise invalid_credentials
    try:
        _validate_settings()
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp"]},
        )
        username = payload.get("sub")
        if (
            payload.get("type") != "admin"
            or username != settings.ADMIN_USERNAME
        ):
            raise invalid_credentials
        return username
    except jwt.PyJWTError as error:
        raise invalid_credentials from error
