from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from pwdlib import PasswordHash

from apps.auth.routers import router as auth_router
from apps.auth.services import require_admin
from apps.core.rate_limit import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

TEST_JWT_SECRET = "test-only-jwt-secret-with-at-least-32-characters"

auth_app = FastAPI()
auth_app.state.limiter = limiter
auth_app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
auth_app.include_router(auth_router)


# Return profile fields only for valid JWTs and acknowledge stateless logout.
def test_profile_and_logout(monkeypatch):
    _configure_auth(monkeypatch)
    monkeypatch.setattr("config.settings.ADMIN_DISPLAY_NAME", "CMS Admin")
    monkeypatch.setattr("config.settings.ADMIN_EMAIL", "admin@example.test")
    from apps.auth.services import create_access_token

    headers = {"Authorization": f"Bearer {create_access_token('cms-admin')}"}
    with TestClient(auth_app) as client:
        assert client.get("/auth/me").status_code == 401
        assert client.post("/auth/logout").status_code == 401
        assert client.get("/auth/me", headers=headers).json() == {
            "username": "cms-admin",
            "name": "CMS Admin",
            "email": "admin@example.test",
        }
        response = client.post("/auth/logout", headers=headers)
        assert response.status_code == 204 and response.content == b""
        assert client.get("/auth/me", headers=headers).status_code == 200
        monkeypatch.setattr("config.settings.ADMIN_DISPLAY_NAME", "")
        monkeypatch.setattr("config.settings.ADMIN_EMAIL", "")
        assert client.get("/auth/me", headers=headers).json() == {
            "username": "cms-admin",
            "name": "cms-admin",
            "email": "cms-admin",
        }


# Provide a database-free protected route for JWT behavior tests.
@auth_app.get("/protected")
def protected_route(_: str = Depends(require_admin)):
    return {"ok": True}


# Configure isolated credentials so authentication tests require no database.
def _configure_auth(monkeypatch):
    monkeypatch.setattr("config.settings.ADMIN_USERNAME", "cms-admin")
    monkeypatch.setattr(
        "config.settings.ADMIN_PASSWORD_HASH",
        PasswordHash.recommended().hash("test-only-password"),
    )
    monkeypatch.setattr("config.settings.JWT_SECRET", TEST_JWT_SECRET)
    monkeypatch.setattr("config.settings.JWT_ALGORITHM", "HS256")
    monkeypatch.setattr("config.settings.JWT_EXPIRE_MINUTES", 1)


# Verify login only accepts the configured administrator credentials.
def test_login_accepts_only_configured_credentials(monkeypatch):
    _configure_auth(monkeypatch)
    with TestClient(auth_app) as client:
        response = client.post(
            "/auth/login",
            json={"username": "cms-admin", "password": "test-only-password"},
        )
        wrong_username = client.post(
            "/auth/login",
            json={"username": "other", "password": "test-only-password"},
        )
        wrong_password = client.post(
            "/auth/login", json={"username": "cms-admin", "password": "wrong"}
        )
        unicode_username = client.post(
            "/auth/login", json={"username": "管理者", "password": "wrong"}
        )

    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    assert response.json()["expires_in"] == 60
    assert {
        wrong_username.status_code,
        wrong_password.status_code,
        unicode_username.status_code,
    } == {401}
    assert (
        wrong_username.json()["detail"]
        == wrong_password.json()["detail"]
        == unicode_username.json()["detail"]
        == "Thông tin đăng nhập không hợp lệ"
    )


# Verify the admin dependency rejects missing, invalid, and expired JWTs.
def test_require_admin_validates_jwts(monkeypatch):
    _configure_auth(monkeypatch)
    now = datetime.now(timezone.utc)
    valid = jwt.encode(
        {
            "sub": "cms-admin",
            "type": "admin",
            "iat": now,
            "exp": now + timedelta(minutes=1),
        },
        TEST_JWT_SECRET,
        algorithm="HS256",
    )
    expired = jwt.encode(
        {
            "sub": "cms-admin",
            "type": "admin",
            "iat": now - timedelta(minutes=2),
            "exp": now - timedelta(minutes=1),
        },
        TEST_JWT_SECRET,
        algorithm="HS256",
    )
    missing_exp = jwt.encode(
        {"sub": "cms-admin", "type": "admin", "iat": now},
        TEST_JWT_SECRET,
        algorithm="HS256",
    )
    with TestClient(auth_app) as client:
        assert client.get("/protected").status_code == 401
        assert (
            client.get(
                "/protected", headers={"Authorization": "Bearer invalid"}
            ).status_code
            == 401
        )
        assert (
            client.get(
                "/protected", headers={"Authorization": f"Bearer {expired}"}
            ).status_code
            == 401
        )
        assert (
            client.get(
                "/protected",
                headers={"Authorization": f"Bearer {missing_exp}"},
            ).status_code
            == 401
        )
        assert client.get(
            "/protected", headers={"Authorization": f"Bearer {valid}"}
        ).json() == {"ok": True}
