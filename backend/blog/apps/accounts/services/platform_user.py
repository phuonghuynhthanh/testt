from typing import Any, Optional

from config.database import DatabaseManager
from apps.accounts.models import PlatformUser


class PlatformUserRepository:
    """Read from the shared platform `users` table."""

    # Keep staff permissions disabled by default until admin explicitly grants scopes.
    DEFAULT_DISABLED_SCOPES = {
        "blog": {"enabled": False},
        "event": {"enabled": False},
        "certificate": {"enabled": False, "courses": {}},
    }

    @staticmethod
    def get_role(user_id: str) -> Optional[str]:
        # Return role string inside the session to avoid detached-instance issues.
        with DatabaseManager.session as session:
            user = session.get(PlatformUser, user_id)
            if not user or not user.role:
                return None
            return str(user.role).strip().lower()

    @staticmethod
    def get_role_and_scopes(user_id: str) -> tuple[Optional[str], dict]:
        """Read role and scopes from shared users table."""
        with DatabaseManager.session as session:
            user = session.get(PlatformUser, user_id)
            if not user:
                return None, {}
            role = str(user.role).strip().lower() if user.role else None
            scopes = user.scopes if isinstance(user.scopes, dict) else {}
            return role, scopes

    @staticmethod
    def get_by_id(user_id: str) -> Optional[dict]:
        # Materialize fields before the session closes.
        with DatabaseManager.session as session:
            user = session.get(PlatformUser, user_id)
            if not user:
                return None
            role = str(user.role).strip().lower() if user.role else None
            scopes = user.scopes if isinstance(user.scopes, dict) else {}
            return {
                "user_id": user.user_id,
                "email": user.email or "",
                "role": role,
                "user_profile": user.user_profile,
                "scopes": scopes,
            }

    # Check whether a user row exists with this normalized email.
    @staticmethod
    def exists_by_email(email: str) -> bool:
        with DatabaseManager.session as session:
            normalized = str(email).strip().lower()
            if not normalized:
                return False
            return (
                session.query(PlatformUser)
                .filter(PlatformUser.email.isnot(None))
                .filter(PlatformUser.email.ilike(normalized))
                .first()
                is not None
            )

    # Check whether a user row already exists for this uid.
    @staticmethod
    def exists_by_user_id(user_id: str) -> bool:
        with DatabaseManager.session as session:
            return session.get(PlatformUser, user_id) is not None

    @staticmethod
    def list_non_user_accounts() -> list[dict[str, Any]]:
        """List all accounts where role is not user."""
        with DatabaseManager.session as session:
            rows = (
                session.query(PlatformUser)
                .filter(PlatformUser.role != "user")
                .order_by(PlatformUser.user_id.asc())
                .all()
            )
            return [
                {
                    "user_id": row.user_id,
                    "email": row.email or "",
                    "role": (str(row.role).strip().lower() if row.role else None),
                    "scopes": row.scopes if isinstance(row.scopes, dict) else {},
                }
                for row in rows
            ]

    @staticmethod
    def update_scopes(user_id: str, scopes: dict[str, Any]) -> Optional[dict]:
        """Update scopes JSON for a specific account."""
        with DatabaseManager.session as session:
            user = session.get(PlatformUser, user_id)
            if not user:
                return None
            user.scopes = scopes
            session.commit()
            session.refresh(user)
            return {
                "user_id": user.user_id,
                "email": user.email or "",
                "role": (str(user.role).strip().lower() if user.role else None),
                "user_profile": user.user_profile,
                "scopes": user.scopes if isinstance(user.scopes, dict) else {},
            }

    # Insert a staff user row with disabled default scopes.
    @classmethod
    def create_staff_account(cls, user_id: str, email: str) -> Optional[dict]:
        with DatabaseManager.session as session:
            if session.get(PlatformUser, user_id):
                return None

            user = PlatformUser(
                user_id=user_id,
                email=str(email).strip().lower(),
                role="staff",
                scopes=cls.DEFAULT_DISABLED_SCOPES,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            return {
                "user_id": user.user_id,
                "email": user.email or "",
                "role": (str(user.role).strip().lower() if user.role else None),
                "user_profile": user.user_profile,
                "scopes": user.scopes if isinstance(user.scopes, dict) else {},
            }
