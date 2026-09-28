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

    # Check whether a Firebase account already exists for the given email.
    @classmethod
    def email_exists(cls, email: str) -> Union[bool, str]:
        cls.initialize_firebase()
        try:
            auth.get_user_by_email(email)
            return True
        except auth.UserNotFoundError:
            return False
        except Exception:
            return "Firebase lookup failed"

    # Create a Firebase email/password account and return the new UID.
    @classmethod
    def create_email_password_user(cls, email: str, password: str) -> Union[str, dict]:
        cls.initialize_firebase()
        try:
            user_record = auth.create_user(email=email, password=password)
            return user_record.uid
        except auth.EmailAlreadyExistsError:
            return {"error": "email_exists", "message": "Email already exists in Firebase"}
        except auth.InvalidPasswordError:
            return {"error": "invalid_password", "message": "Invalid password"}
        except Exception:
            return {"error": "create_failed", "message": "Failed to create Firebase user"}
