import asyncio
import base64
import json

import httpx
import pytest

from apps.media.schemas import AIImageGenerateRequest
from apps.media.services.cloudflare_ai import AIImageError, CloudflareAIImageProvider
from apps.openai.services.gemini_config import GeminiConfig


# Keep every image-provider check offline while exercising the real prompt preparation flow.
@pytest.fixture(autouse=True)
def stub_gemini(monkeypatch):
    # Return one bounded photographic scene instead of calling the live text provider.
    async def completion(self, user_prompt, system_prompt, **_kwargs):
        subject = json.loads(user_prompt).get("visualDirection") or "quantitative research"
        return f"A realistic photograph about {subject}, with a focused subject in a relevant workplace, natural window light and restrained colors."

    monkeypatch.setattr(GeminiConfig, "gemini_chat_completion", completion)


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
@pytest.mark.parametrize("encoded", [False, "legacy", "flux"])
def test_cloudflare_image_output_formats(monkeypatch, encoded):
    content = png(1024, 576)

    # Return the selected Cloudflare success representation.
    def handler(request):
        if encoded:
            return httpx.Response(
                200, json={"result": {"image": base64.b64encode(content).decode()} if encoded == "flux" else base64.b64encode(content).decode()}, request=request
            )
        return httpx.Response(
            200, content=content, headers={"content-type": "image/png"}, request=request
        )

    image = generate(monkeypatch, handler)

    assert (image.media_type, image.width, image.height) == ("image/png", 1024, 576)


# Send only FLUX-supported fields and keep subject-specific photographic direction.
@pytest.mark.parametrize("quality", ["FAST", "BALANCED", "HIGH"])
def test_cloudflare_prompt_preserves_subject_and_rejects_common_artifacts(monkeypatch, quality):
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
        quality=quality,
    )

    assert "A systematic portfolio navigating volatile markets" in captured["prompt"]
    assert "photorealistic" in captured["prompt"]
    assert "no embedded text" in captured["prompt"]
    assert set(captured) == {"prompt", "steps"}
    assert captured["steps"] == 8
    assert len(captured["prompt"]) <= 2048


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


# Preserve the model's natural dimensions even when a legacy ratio was supplied.
def test_cloudflare_preserves_natural_dimensions(monkeypatch):
    # Return a square image for the default wide request.
    def handler(request):
        return httpx.Response(
            200,
            content=png(1024, 1024),
            headers={"content-type": "image/png"},
            request=request,
        )

    image = generate(monkeypatch, handler, aspectRatio="16:9")
    assert (image.width, image.height, image.bytes) == (1024, 1024, png(1024, 1024))


# Normalize blank prompt text and constrain the only supported size in the schema.
def test_ai_image_request_contract():
    request = AIImageGenerateRequest(
        purpose="LINKEDIN", prompt="  ", context="  Trading systems  "
    )

    assert request.prompt is None
    assert request.context == "Trading systems"
    properties = AIImageGenerateRequest.model_json_schema()["properties"]
    assert properties["aspectRatio"]["deprecated"] is True
    assert properties["quality"]["deprecated"] is True
    with pytest.raises(ValueError):
        AIImageGenerateRequest(purpose="LINKEDIN", context="topic", size="2K")
    assert len(AIImageGenerateRequest(purpose="BLOG_BANNER", context="a" * 20000).context) == 20000
    with pytest.raises(ValueError):
        AIImageGenerateRequest(purpose="BLOG_BANNER", context="a" * 20001)


# Pass Vietnamese article content and exclusions to the dedicated English brief system prompt.
def test_image_brief_uses_current_article(monkeypatch):
    captured = {}

    # Capture the text-generation inputs and return a concise English photograph description.
    async def completion(self, user_prompt, system_prompt, **kwargs):
        captured.update(json.loads(user_prompt), system=system_prompt, options=kwargs)
        return "A software engineer examining a physical server rack in a quiet data center with soft natural light."

    monkeypatch.setattr(GeminiConfig, "gemini_chat_completion", completion)
    prompt = asyncio.run(CloudflareAIImageProvider._prompt(AIImageGenerateRequest(
        purpose="BLOG_BANNER", context="Độ trễ giao dịch\n" + "Nội dung đang chỉnh sửa. " * 500,
        prompt="Phòng máy chủ", negativePrompt="extra fingers",
    )))
    assert captured["article"].startswith("Độ trễ giao dịch")
    assert len(captured["article"]) > 1000
    assert captured["visualDirection"] == "Phòng máy chủ"
    assert captured["additionalExclusions"] == "extra fingers"
    assert "plain English paragraph" in captured["system"]
    assert captured["options"] == {"max_retries": 0}
    assert "server rack" in prompt


# Reject unusable text output before entering the billable image-provider boundary.
@pytest.mark.parametrize("brief", ["", "short", "x" * 1001, "```" + "x" * 80, None])
def test_invalid_brief_does_not_call_cloudflare(monkeypatch, brief):
    # Return the invalid provider output chosen for this scenario.
    async def completion(*_args, **_kwargs):
        return brief

    monkeypatch.setattr(GeminiConfig, "gemini_chat_completion", completion)
    with pytest.raises(AIImageError) as error:
        generate(monkeypatch, lambda _: pytest.fail("image provider must not be called"))
    assert error.value.code == "ai_image_invalid_brief"


# Hide text-provider diagnostics and stop image generation when preparing the brief fails.
def test_brief_failure_is_safe(monkeypatch):
    # Simulate a provider timeout containing an internal diagnostic.
    async def completion(*_args, **_kwargs):
        raise RuntimeError("private provider diagnostic")

    monkeypatch.setattr(GeminiConfig, "gemini_chat_completion", completion)
    with pytest.raises(AIImageError) as error:
        generate(monkeypatch, lambda _: pytest.fail("image provider must not be called"))
    assert error.value.code == "ai_image_brief_unavailable"
    assert "private" not in error.value.as_dict()["message"]


# Reject malformed Base64 and missing FLUX image fields with a stable error code.
@pytest.mark.parametrize("body", [{"result": {"image": "%%%"}}, {"result": {}}, {"result": {"image": 42}}])
def test_invalid_flux_response(monkeypatch, body):
    with pytest.raises(AIImageError) as error:
        generate(monkeypatch, lambda request: httpx.Response(200, json=body, request=request))
    assert error.value.code == "ai_image_invalid_response"
