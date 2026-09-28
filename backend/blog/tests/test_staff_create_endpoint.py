import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

# Seed minimum env vars required by config.settings at import time.
os.environ.setdefault("DATABASE_DRIVER", "postgresql")
os.environ.setdefault("DATABASE_USERNAME", "postgres")
os.environ.setdefault("DATABASE_PASSWORD", "postgres")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_NAME", "quantvn")
os.environ.setdefault("DATABASE_PORT", "5432")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost")
sys.path.append(str(Path(__file__).resolve().parents[1]))

from apps.accounts import schemas
from apps.accounts.routers import router
from apps.accounts.services.authenticate import AccountService


# Build a lightweight app so tests stay isolated from global startup side effects.
def _build_client_with_role(role: str) -> TestClient:
    app = FastAPI()
    app.include_router(router)

    # Override auth dependency to control caller role in each test.
    async def _override_current_user() -> schemas.UserSchema:
        return schemas.UserSchema(user_id="admin_uid", email="admin@test.com", role=role, scopes={})

    app.dependency_overrides[AccountService.current_user] = _override_current_user
    return TestClient(app)


# Verify admin can create staff account when no conflicts exist.
def test_create_staff_account_success(monkeypatch):
    client = _build_client_with_role("admin")

    # Mock repository/Firebase checks to simulate clean creation path.
    monkeypatch.setattr(
        "apps.accounts.routers.PlatformUserRepository.exists_by_email",
        lambda *_: False,
    )
    monkeypatch.setattr(
        "apps.accounts.routers.FirebaseService.email_exists",
        lambda *_: False,
    )
    monkeypatch.setattr(
        "apps.accounts.routers.FirebaseService.create_email_password_user",
        lambda *_: "staff_uid_01",
    )
    monkeypatch.setattr(
        "apps.accounts.routers.PlatformUserRepository.exists_by_user_id",
        lambda *_: False,
    )
    monkeypatch.setattr(
        "apps.accounts.routers.PlatformUserRepository.create_staff_account",
        lambda *_: {
            "user_id": "staff_uid_01",
            "email": "staff@test.com",
            "role": "staff",
            "scopes": {
                "blog": {"enabled": False},
                "event": {"enabled": False},
                "certificate": {"enabled": False, "courses": {}},
            },
        },
    )

    response = client.post(
        "/admin/account/staff-create",
        json={"email": "staff@test.com", "password": "securepass123"},
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["user_id"] == "staff_uid_01"
    assert payload["role"] == "staff"
    assert payload["scopes"]["blog"]["enabled"] is False


# Verify API rejects when email already exists in Firebase.
def test_create_staff_account_firebase_conflict(monkeypatch):
    client = _build_client_with_role("admin")

    # Keep DB clean while forcing Firebase email conflict.
    monkeypatch.setattr(
        "apps.accounts.routers.PlatformUserRepository.exists_by_email",
        lambda *_: False,
    )
    monkeypatch.setattr(
        "apps.accounts.routers.FirebaseService.email_exists",
        lambda *_: True,
    )

    response = client.post(
        "/admin/account/staff-create",
        json={"email": "staff@test.com", "password": "securepass123"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Email already exists in Firebase"


# Verify API rejects when email already exists in users table.
def test_create_staff_account_db_conflict(monkeypatch):
    client = _build_client_with_role("admin")

    # Force DB conflict at the first guard clause.
    monkeypatch.setattr(
        "apps.accounts.routers.PlatformUserRepository.exists_by_email",
        lambda *_: True,
    )

    response = client.post(
        "/admin/account/staff-create",
        json={"email": "staff@test.com", "password": "securepass123"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Email already exists in users table"


# Verify non-admin callers cannot access the staff creation endpoint.
def test_create_staff_account_non_admin_forbidden():
    client = _build_client_with_role("staff")

    response = client.post(
        "/admin/account/staff-create",
        json={"email": "staff@test.com", "password": "securepass123"},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Forbidden: admin only"
