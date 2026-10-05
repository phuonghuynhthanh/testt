import asyncio

import httpx
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from apps.auth.services import require_admin
from apps.core.errors import register_error_handlers
from apps.core.rate_limit import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from apps.core.storage import StorageService
from apps.linkedin_posts.schemas import ValidatedImage
from apps.linkedin_posts.services.pexels import PexelsService
from apps.media.routers import router
from apps.media.services.cloudflare_ai import CloudflareAIImageProvider

CANDIDATE = {
    "provider": "pexels", "providerId": "123", "sourceUrl": "https://www.pexels.com/photo/123/",
    "imageUrl": "https://images.pexels.com/photos/123/image.jpeg", "photographer": "A",
    "attribution": "Photo by A on Pexels", "altText": "Server room", "order": 1,
}


# Create a fully isolated media API that never starts database or storage services.
def media_client():
    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    app.include_router(router)
    register_error_handlers(app)
    # Authorize only local test requests with no production session.
    app.dependency_overrides[require_admin] = lambda: "admin"
    return TestClient(app)


# Return the smallest byte fixture supported by the shared PNG validator.
def image():
    content = b"\x89PNG\r\n\x1a\n" + b"\0" * 8 + (1024).to_bytes(4, "big") * 2
    return ValidatedImage(bytes=content, media_type="image/png", width=1024, height=1024)


# Import an explicit choice into storage without creating or updating an article.
def test_pexels_import_stores_selected_banner(monkeypatch):
    captured = {}

    # Return already validated provider bytes without any external request.
    async def download(self, candidate):
        captured["candidate"] = candidate.providerId
        return image()

    # Record the storage boundary and return a durable server-owned key.
    def store(cls, value, media_type, folder):
        captured.update(bytes=value, media_type=media_type, folder=folder)
        return "blog-pexels/selected.png"

    monkeypatch.setattr(PexelsService, "download", download)
    monkeypatch.setattr(StorageService, "store_image_bytes", classmethod(store))
    response = media_client().post("/media/pexels/import", json=CANDIDATE)
    assert response.status_code == 201
    assert response.json()["objectKey"] == "blog-pexels/selected.png"
    assert response.json()["origin"] == "pexels"
    assert captured == {"candidate": "123", "bytes": image().bytes, "media_type": "image/png", "folder": "blog-pexels"}


# Reject an arbitrary image host before a provider request or storage mutation.
def test_pexels_import_rejects_untrusted_host(monkeypatch):
    monkeypatch.setattr(StorageService, "store_image_bytes", lambda *_: pytest.fail("must not store"))
    response = media_client().post("/media/pexels/import", json={**CANDIDATE, "imageUrl": "https://example.com/private.png"})
    assert response.status_code == 422
    assert "example.com" not in response.text


# Propagate a safe storage failure without claiming the banner was imported.
def test_pexels_import_storage_failure(monkeypatch):
    # Supply validated bytes without a live provider.
    async def download(self, candidate):
        return image()

    # Simulate a failed write without returning a successful object key.
    def store(*_args):
        raise HTTPException(status_code=500, detail="private MinIO diagnostic")

    monkeypatch.setattr(PexelsService, "download", download)
    monkeypatch.setattr(StorageService, "store_image_bytes", store)
    response = media_client().post("/media/pexels/import", json=CANDIDATE)
    assert response.status_code == 500
    assert "private" not in response.text
    assert "objectKey" not in response.json()


# Enforce the download byte ceiling before importing any oversized candidate.
def test_pexels_download_byte_limit():
    # Return a provider-hosted image larger than the test's explicit byte limit.
    def handler(request):
        return httpx.Response(200, content=b"a" * 65, headers={"content-type": "image/png"}, request=request)

    # Own the mock HTTP transport while exercising the existing bounded downloader.
    async def run():
        from apps.linkedin_posts.schemas import PexelsCandidate
        from apps.linkedin_posts.exceptions import LinkedInError

        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            with pytest.raises(LinkedInError) as error:
                await PexelsService("key", client, max_bytes=64).download(PexelsCandidate(**CANDIDATE))
            assert error.value.code == "invalid_image"

    asyncio.run(run())


# Stop before storage and return a safe error when the selected image cannot be downloaded.
@pytest.mark.parametrize("failure", ["status", "timeout"])
def test_pexels_import_download_failure(monkeypatch, failure):
    # Simulate provider failure through the real bounded downloader.
    def handler(request):
        if failure == "timeout":
            raise httpx.ReadTimeout("private network diagnostic", request=request)
        return httpx.Response(503, text="private provider diagnostic", request=request)

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    service = PexelsService("key", client)
    monkeypatch.setattr("apps.media.routers.PexelsService", lambda *_: service)
    monkeypatch.setattr(StorageService, "store_image_bytes", lambda *_: pytest.fail("must not store"))
    try:
        response = media_client().post("/media/pexels/import", json=CANDIDATE)
        assert response.status_code == 422
        assert response.json()["detail"]["code"] == "request_failed"
        assert "Vui lòng" in response.json()["detail"]["message"]
        assert "private" not in response.text
        assert "objectKey" not in response.json()
    finally:
        asyncio.run(client.aclose())


# Return natural image dimensions, a short default alt text, and the actual fixed quality.
def test_ai_media_response_uses_natural_dimensions(monkeypatch):
    # Bypass both providers so this test covers only the storage and API response contract.
    async def generate(self, data):
        return image()

    monkeypatch.setattr(CloudflareAIImageProvider, "generate", generate)
    monkeypatch.setattr(StorageService, "store_image_bytes", lambda *_: "blog-ai/image.png")
    response = media_client().post("/media/ai/generate", json={
        "purpose": "BLOG_BANNER", "context": "Current title\n" + "x" * 19000,
        "quality": "HIGH", "aspectRatio": "16:9",
    })
    assert response.status_code == 201
    assert response.json()["aspectRatio"] == "1:1"
    assert response.json()["quality"] == "BALANCED"
    assert response.json()["media"]["altText"] == "Current title"
