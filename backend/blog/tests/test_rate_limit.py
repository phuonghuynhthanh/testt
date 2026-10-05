import runpy

import pytest
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient

from apps.auth.services import require_admin
from apps.blogs.services.blog import BlogServices
from apps.core.errors import STATUS_MESSAGES
from apps.core.rate_limit import client_ip, limiter
from apps.core.storage import StorageService
from apps.linkedin_posts.services.posts import LinkedInPostService
from apps.main import app
from apps.openai.services.gemini_ai import GeminiAiService
from config import settings


# Exercise production middleware without starting database or storage services.
@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(limiter, "enabled", True)

    # Keep protected HTTP tests independent of JWT credentials.
    def admin():
        return "admin"

    monkeypatch.setitem(app.dependency_overrides, require_admin, admin)
    client = TestClient(app)
    yield client
    client.close()


# Count rejected login attempts without hashing passwords or creating tokens.
@pytest.fixture
def failed_login(monkeypatch):
    calls = []

    # Emulate a credential failure after the rate limit has been checked.
    def authenticate(username, password):
        calls.append(username)
        raise HTTPException(status_code=401, detail=STATUS_MESSAGES[401])

    monkeypatch.setattr("apps.auth.routers.authenticate", authenticate)
    return calls


# Reject the sixth attempt with the shared message and a usable retry interval.
def test_login_sixth_attempt_is_limited(client, failed_login):
    for _ in range(5):
        assert client.post("/auth/login", json={"username": "admin", "password": "bad"}).status_code == 401
    response = client.post("/auth/login", json={"username": "admin", "password": "bad"})
    assert response.status_code == 429
    assert response.json() == {"detail": STATUS_MESSAGES[429]}
    assert 0 < int(response.headers["Retry-After"]) <= 61
    assert response.headers["X-RateLimit-Limit"] == "5"
    assert len(failed_login) == 5


# Read the disabled environment setting and verify repeated requests remain unblocked.
def test_rate_limit_disabled(client, failed_login, monkeypatch):
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "false")
    configured = runpy.run_path("config/settings.py")
    assert configured["RATE_LIMIT_ENABLED"] is False
    monkeypatch.setattr(limiter, "enabled", configured["RATE_LIMIT_ENABLED"])
    for _ in range(7):
        assert client.post("/auth/login", json={"username": "admin", "password": "bad"}).status_code == 401
    assert len(failed_login) == 7


# Enforce the default limit even on an endpoint without a rate-limit decorator.
def test_default_limit_applies_through_middleware(client, monkeypatch):
    # Return local data without opening a database connection.
    def list_blogs(*args):
        return {"items": []}

    monkeypatch.setattr(BlogServices, "get_blogs_for_admin", list_blogs)
    for _ in range(120):
        assert client.get("/blog/admin/blogs").status_code == 200
    response = client.get("/blog/admin/blogs")
    assert response.status_code == 429
    assert response.json() == {"detail": STATUS_MESSAGES[429]}
    assert int(response.headers["Retry-After"]) > 0
    monkeypatch.setattr(limiter, "enabled", False)
    assert client.get("/blog/admin/blogs").status_code == 200


# Inject headers into an async JSON response and stop before the eleventh AI call.
def test_ai_limit_prevents_provider_call(client, monkeypatch):
    calls = []

    # Return deterministic SEO data without consuming provider quota.
    async def generate(*args, **kwargs):
        calls.append(1)
        return {"keywords": ["quant"]}

    monkeypatch.setattr(GeminiAiService, "generate_seo_keywords", generate)
    for _ in range(10):
        response = client.post("/openai/seo-keywords", json={"blog_title": "Quant", "blog_content": "Research"})
        assert response.status_code == 200
        assert response.headers["X-RateLimit-Limit"] == "10"
    response = client.post("/openai/seo-keywords", json={"blog_title": "Quant", "blog_content": "Research"})
    assert response.status_code == 429
    assert len(calls) == 10


# Prevent rotating post IDs from bypassing the publish endpoint limit.
def test_publish_limit_is_shared_across_post_ids(client, monkeypatch):
    calls = []

    # Record publication attempts without writing to LinkedIn or the database.
    async def publish(post_id):
        calls.append(post_id)
        return {"id": post_id}

    monkeypatch.setattr(LinkedInPostService, "publish", publish)
    for index in range(10):
        assert client.post(f"/linkedin/posts/post-{index}/publish").status_code == 200
    assert client.post("/linkedin/posts/another-post/publish").status_code == 429
    assert len(calls) == 10


# Stop repeated uploads at the higher write limit before storage is called again.
def test_upload_limit_prevents_storage_call(client, monkeypatch):
    calls = []

    # Emulate storing an already validated image without accessing MinIO.
    def upload(image, folder):
        calls.append(image.filename)
        return "linkedin/image.gif"

    monkeypatch.setattr(StorageService, "upload_image", upload)
    for _ in range(30):
        response = client.post("/linkedin/media/upload", files={"image": ("image.gif", b"GIF89a\x01\x00\x01\x00", "image/gif")})
        assert response.status_code == 201
        assert response.headers["X-RateLimit-Limit"] == "30"
    response = client.post("/linkedin/media/upload", files={"image": ("image.gif", b"GIF89a\x01\x00\x01\x00", "image/gif")})
    assert response.status_code == 429
    assert len(calls) == 30


# Exempt CORS preflight and expose retry headers to browser clients.
def test_cors_preflight_does_not_consume_limit(client, failed_login):
    origin = settings.ALLOWED_ORIGINS[0]
    for _ in range(7):
        response = client.options("/auth/login", headers={"Origin": origin, "Access-Control-Request-Method": "POST"})
        assert response.status_code == 200
        assert "X-RateLimit-Limit" not in response.headers
    for _ in range(5):
        assert client.post("/auth/login", json={"username": "admin", "password": "bad"}).status_code == 401
    response = client.post("/auth/login", headers={"Origin": origin}, json={"username": "admin", "password": "bad"})
    assert response.status_code == 429
    assert response.headers["Access-Control-Allow-Origin"] == origin
    assert "Retry-After" in response.headers["Access-Control-Expose-Headers"]


# Honor forwarded IP buckets only when the proxy is explicitly trusted.
@pytest.mark.parametrize("trust_proxy", [False, True])
def test_forwarded_ip_buckets(client, failed_login, monkeypatch, trust_proxy):
    monkeypatch.setattr(settings, "RATE_LIMIT_TRUST_PROXY", trust_proxy)
    for _ in range(5):
        assert client.post("/auth/login", headers={"X-Forwarded-For": "198.51.100.1, 10.0.0.1"}, json={"username": "admin", "password": "bad"}).status_code == 401
    response = client.post("/auth/login", headers={"X-Forwarded-For": "198.51.100.2, 10.0.0.1"}, json={"username": "admin", "password": "bad"})
    assert response.status_code == (401 if trust_proxy else 429)


# Fall back to the connection address for empty forwarded headers.
def test_client_ip_fallback(monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_TRUST_PROXY", True)
    request = Request({"type": "http", "headers": [(b"x-forwarded-for", b" , 10.0.0.1")], "client": ("198.51.100.3", 1234)})
    assert client_ip(request) == "198.51.100.3"


# Keep public image redirects available no matter how many images a page loads.
def test_public_image_redirect_is_exempt(client, monkeypatch):
    monkeypatch.setattr(StorageService, "presigned_image_url", lambda key: f"https://cdn.test/{key}")
    for _ in range(130):
        assert client.get("/uploads/image.png", follow_redirects=False).status_code in {302, 307}
