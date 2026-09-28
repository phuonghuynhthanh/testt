import asyncio
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault("DATABASE_DRIVER", "postgresql")
os.environ.setdefault("DATABASE_USERNAME", "postgres")
os.environ.setdefault("DATABASE_PASSWORD", "postgres")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_NAME", "quantvn")
os.environ.setdefault("DATABASE_PORT", "5432")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost")
sys.path.append(str(Path(__file__).resolve().parents[1]))

from apps.accounts.services.authenticate import AccountService


# Staff with certificate-only scopes can pass current_user.
def test_current_user_allows_staff_without_blog_scope(monkeypatch):
    monkeypatch.setattr(
        "apps.accounts.services.authenticate.FirebaseService.verify_id_token",
        lambda *_: {"uid": "staff_1", "email": "staff@test.com"},
    )
    monkeypatch.setattr(
        "apps.accounts.services.authenticate.PlatformUserRepository.get_role_and_scopes",
        lambda *_: (
            "staff",
            {
                "blog": {"enabled": False},
                "certificate": {
                    "enabled": True,
                    "courses": {"c1": {"content": False, "class": True}},
                },
            },
        ),
    )

    credential = SimpleNamespace(credentials="token")
    user = asyncio.run(AccountService.current_user(credential))
    assert user.role == "staff"
    assert user.scopes["certificate"]["enabled"] is True


# Blog module dependency still requires scopes.blog.enabled for staff.
def test_current_blog_user_requires_blog_scope(monkeypatch):
    monkeypatch.setattr(
        "apps.accounts.services.authenticate.FirebaseService.verify_id_token",
        lambda *_: {"uid": "staff_1", "email": "staff@test.com"},
    )
    monkeypatch.setattr(
        "apps.accounts.services.authenticate.PlatformUserRepository.get_role_and_scopes",
        lambda *_: (
            "staff",
            {
                "blog": {"enabled": False},
                "certificate": {
                    "enabled": True,
                    "courses": {"c1": {"content": False, "class": True}},
                },
            },
        ),
    )

    credential = SimpleNamespace(credentials="token")
    with pytest.raises(HTTPException) as exc:
        asyncio.run(AccountService.current_blog_user(credential))
    assert exc.value.status_code == 403
    assert exc.value.detail == "Forbidden: blog scope required"
