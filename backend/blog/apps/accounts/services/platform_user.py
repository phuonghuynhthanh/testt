from typing import Optional

from apps.accounts.models import PlatformUser
from config.database import DatabaseManager


class PlatformUserRepository:
    """Read role and scopes from the shared platform users table."""

    # Read only the role and Blog scope required by Blog authentication.
    @staticmethod
    def get_role_and_scopes(user_id: str) -> tuple[Optional[str], dict]:
        with DatabaseManager.session as session:
            user = session.get(PlatformUser, user_id)
            if not user:
                return None, {}
            role = str(user.role).strip().lower() if user.role else None
            scopes = user.scopes if isinstance(user.scopes, dict) else {}
            return role, scopes
