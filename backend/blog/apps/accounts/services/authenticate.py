from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from apps.accounts import schemas
from apps.accounts.services.firebase import FirebaseService
from apps.accounts.services.platform_user import PlatformUserRepository
from config.settings import BLOG_ALLOWED_ROLES


class AccountService:
    """Auth dependency: Firebase ID token + platform staff/admin role gate."""

    @staticmethod
    def _has_blog_scope(role: str, scopes: dict) -> bool:
        """Allow admin bypass, otherwise require scopes.blog.enabled=true."""
        if role == "admin":
            return True
        blog_scope = scopes.get("blog") if isinstance(scopes, dict) else None
        return isinstance(blog_scope, dict) and bool(blog_scope.get("enabled") is True)

    @classmethod
    async def current_user(
        cls,
        credential: HTTPAuthorizationCredentials = Depends(
            HTTPBearer(auto_error=False)
        ),
    ) -> schemas.UserSchema:
        token = credential.credentials if credential else None
        decoded = FirebaseService.verify_id_token(token)
        if isinstance(decoded, str):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=decoded,
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = decoded.get("uid")
        email = decoded.get("email") or ""
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: Missing uid",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Require an existing platform user with staff or admin role.
        role, scopes = PlatformUserRepository.get_role_and_scopes(user_id)
        if role not in BLOG_ALLOWED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: staff or admin role required",
            )

        return schemas.UserSchema(user_id=user_id, email=email, role=role, scopes=scopes)

    # Gate blog module APIs behind scopes.blog.enabled (admin bypass).
    @classmethod
    async def current_blog_user(
        cls,
        credential: HTTPAuthorizationCredentials = Depends(
            HTTPBearer(auto_error=False)
        ),
    ) -> schemas.UserSchema:
        current_user = await cls.current_user(credential)
        if not cls._has_blog_scope(current_user.role, current_user.scopes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: blog scope required",
            )
        return current_user
