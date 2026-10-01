import asyncio
import base64
import json

import httpx
import pytest

from apps.media.schemas import AIImageGenerateRequest
from apps.media.services.cloudflare_ai import AIImageError, CloudflareAIImageProvider


# Build the minimum PNG header used by the shared byte validator.
def png(width: int, height: int) -> bytes:
    return b"\x89PNG\r\n\x1a\n" + b"\0" * 8 + width.to_bytes(4, "big") + height.to_bytes(4, "big")


# Run one provider request against an in-memory HTTP transport.
def generate(monkeypatch, handler, **values):
    monkeypatch.setattr("config.settings.CLOUDFLARE_ACCOUNT_ID", "account")
    monkeypatch.setattr("config.settings.CLOUDFLARE_API_TOKEN", "token")
    monkeypatch.setattr("config.settings.CLOUDFLARE_IMAGE_MODEL", "@cf/model")

    # Own and close the injected client around one generation call.
    async def run():
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        try:
            request = AIImageGenerateRequest(
                purpose="BLOG_BANNER", context="Quant research", **values
            )
            return await CloudflareAIImageProvider(client).generate(request)
        finally:
            await client.aclose()

    return asyncio.run(run())


# Accept both documented binary output and the encoded response envelope.
@pytest.mark.parametrize("encoded", [False, True])
def test_cloudflare_image_output_formats(monkeypatch, encoded):
    content = png(1024, 576)

    # Return the selected Cloudflare success representation.
    def handler(request):
        if encoded:
            return httpx.Response(
                200, json={"result": base64.b64encode(content).decode()}, request=request
            )
        return httpx.Response(
            200, content=content, headers={"content-type": "image/png"}, request=request
        )

    image = generate(monkeypatch, handler)

    assert (image.media_type, image.width, image.height) == ("image/png", 1024, 576)


# Combine the administrator's subject with the server-owned editorial direction.
def test_cloudflare_prompt_preserves_subject_and_rejects_common_artifacts(monkeypatch):
    content = png(1024, 576)
    captured = {}

    # Capture the generated model payload before returning a valid image.
    def handler(request):
        captured.update(json.loads(request.content))
        return httpx.Response(200, content=content, headers={"content-type": "image/png"}, request=request)

    generate(
        monkeypatch,
        handler,
        prompt="A systematic portfolio navigating volatile markets",
        negativePrompt="extra fingers",
    )

    assert "Primary subject: A systematic portfolio navigating volatile markets." in captured["prompt"]
    assert "Wide blog banner" in captured["prompt"]
    assert "text, letters, words" in captured["negative_prompt"]
    assert captured["negative_prompt"].endswith("extra fingers")


# Preserve distinct operational codes for quota, capacity, and rate limiting.
@pytest.mark.parametrize(
    ("status", "body", "code"),
    [
        (429, {"errors": [{"code": 3036}]}, "ai_image_quota_exceeded"),
        (429, {"errors": [{"code": 3040}]}, "ai_image_capacity"),
        (429, {"errors": []}, "ai_image_rate_limited"),
    ],
)
def test_cloudflare_error_mapping(monkeypatch, status, body, code):
    # Return one safe provider error without exposing its response body.
    def handler(request):
        return httpx.Response(status, json=body, request=request)

    with pytest.raises(AIImageError) as error:
        generate(monkeypatch, handler)

    assert error.value.code == code


# Reject valid-looking images when Cloudflare returns the wrong requested dimensions.
def test_cloudflare_rejects_wrong_dimensions(monkeypatch):
    # Return a square image for the default wide request.
    def handler(request):
        return httpx.Response(
            200,
            content=png(1024, 1024),
            headers={"content-type": "image/png"},
            request=request,
        )

    with pytest.raises(AIImageError) as error:
        generate(monkeypatch, handler)

    assert error.value.code == "ai_image_invalid_response"


# Normalize blank prompt text and constrain the only supported size in the schema.
def test_ai_image_request_contract():
    request = AIImageGenerateRequest(
        purpose="LINKEDIN", prompt="  ", context="  Trading systems  "
    )

    assert request.prompt is None
    assert request.context == "Trading systems"
    with pytest.raises(ValueError):
        AIImageGenerateRequest(purpose="LINKEDIN", context="topic", size="2K")
