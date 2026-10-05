import json

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from apps.core.rate_limit import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from apps.auth.services import require_admin
from apps.blogs.models import Blog
from apps.blogs.routers import router as blog_router
from apps.blogs.schemas import BlogUpdate, SEOInputSchema
from apps.blogs.services.blog import BlogServices
from apps.categories.models import Category
from apps.core.errors import public_error_detail, register_error_handlers
from apps.linkedin_posts.exceptions import LinkedInError
from config.database import DatabaseManager


# Exercise the real JSON database boundary for approval and legacy SEO updates.
@pytest.mark.parametrize("seo", [None, {}, {"published_time": "2026-09-30 12:00:00"}])
@pytest.mark.parametrize("update_seo", [False, True])
def test_blog_partial_update_keeps_seo_json_safe(monkeypatch, seo, update_seo):
    engine = create_engine("sqlite:///:memory:")
    Category.__table__.create(engine)
    Blog.__table__.create(engine)
    monkeypatch.setattr(DatabaseManager, "session", Session(engine))
    try:
        Blog.create(id="blog-1", tag="quant", title="Reviewed", banner_url="existing/banner.jpg",
                    link_post="reviewed", content="Preserved content", category="Research", state="PENDING", seo=seo or {})
        data = BlogUpdate(state="APPROVED", **({"seo": SEOInputSchema(title="Reviewed", description="Description", keywords=[])} if update_seo else {}))
        updated = BlogServices.update_blog("blog-1", data)
        assert updated.state == "APPROVED"
        assert updated.content == "Preserved content"
        assert updated.banner_url == "existing/banner.jpg"
        assert isinstance(updated.seo["modified_time"], str)
        json.dumps(updated.seo)
        if seo and seo.get("published_time"):
            assert updated.seo["published_time"] == seo["published_time"]
        cleared = BlogServices.update_blog("blog-1", BlogUpdate(banner_url=""))
        assert cleared.banner_url == ""
        assert cleared.seo["banner_url"] == ""
    finally:
        DatabaseManager.session.close()
        engine.dispose()


# Reject invalid multipart inputs without a database connection or internal error response.
@pytest.mark.parametrize("payload", ["{broken", "null", '{"title": "Missing required fields"}', '{"unknown": "secret"}'])
def test_invalid_blog_multipart_is_friendly(payload):
    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    app.include_router(blog_router)
    register_error_handlers(app)
    # Authorize only this isolated test app, without changing production dependencies.
    app.dependency_overrides[require_admin] = lambda: "admin"
    response = TestClient(app).post("/blog", data={"blog_data": payload})
    assert response.status_code == 422
    assert "secret" not in response.text
    assert "traceback" not in response.text.lower()
    assert "detail" in response.json()


# Keep provider safety flags while translating known and unexpected operational messages.
def test_error_detail_preserves_retry_metadata():
    detail = public_error_detail({"code": "ambiguous_publish", "duplicateRisk": True, "retryable": False}, 503)
    assert detail["duplicateRisk"] is True
    assert detail["retryable"] is False
    assert "tránh đăng trùng" in detail["message"]
    assert "SELECT" not in public_error_detail("SELECT secret FROM users", 500)
    assert "hết hạn" in LinkedInError("invalid_or_expired_token", "internal token").as_dict()["message"]


# Ensure unexpected failures and raw HTTP diagnostics stay out of user responses.
def test_app_error_boundary_hides_diagnostics():
    app = FastAPI()
    register_error_handlers(app)

    # Raise an ordinary internal failure at the request boundary.
    @app.get("/unexpected")
    def unexpected():
        raise RuntimeError("SELECT private FROM credentials")

    # Raise an older service error carrying raw implementation details.
    @app.get("/http")
    def http_failure():
        raise HTTPException(status_code=500, detail="SQLAlchemy private diagnostic")

    client = TestClient(app, raise_server_exceptions=False)
    for path in ["/unexpected", "/http"]:
        response = client.get(path)
        assert response.status_code == 500
        assert "private" not in response.text
        assert "detail" in response.json()
