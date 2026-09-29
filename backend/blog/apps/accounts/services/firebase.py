from typing import Optional, Union

import firebase_admin
from firebase_admin import auth, credentials

from config.settings import FIREBASE_SERVER_CREDENTIALS


class FirebaseService:
    """Firebase Admin helpers for verifying client ID tokens."""

    @staticmethod
    def initialize_firebase() -> None:
        # Initialize once per process (uvicorn/gunicorn workers).
        if not firebase_admin._apps:
            cred = credentials.Certificate(FIREBASE_SERVER_CREDENTIALS)
            firebase_admin.initialize_app(cred)

    @classmethod
    def verify_id_token(cls, token: Optional[str]) -> Union[dict, str]:
        """Verify a Firebase ID token; return decoded claims or an error message."""
        if not token:
            return "Missing token"

        cls.initialize_firebase()
        try:
            return auth.verify_id_token(token)
        except auth.ExpiredIdTokenError:
            return "Invalid token: Token has expired"
        except auth.InvalidIdTokenError:
            return "Invalid token: Token is invalid"
        except Exception:
            return "Invalid token: Authentication failed"
