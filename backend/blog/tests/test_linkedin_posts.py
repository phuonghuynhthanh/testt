import asyncio
import json
from io import BytesIO
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from apps.core.storage import StorageService
from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.routers import upload_media
from apps.linkedin_posts.schemas import Connection, FactualReview, GeneratedPost, ImagePlan, IndependentDraftRequest, LinkedInArticleSource, LinkedInMode, LinkedInPostCreate, LinkedInPostStatus, LinkedInPostUpdate, LinkedInSourceType, MediaMode, MediaPlan, OrganizationVerification, PexelsCandidate, TopicProposalRequest, UploadedMedia, ValidatedImage
from apps.linkedin_posts.services.generator import LinkedInDraftGenerator, _generation_prompt, render_generated_post
from apps.linkedin_posts.services.image import validate_image_bytes
from apps.linkedin_posts.services.linkedin_client import LinkedInClient, error_for_response, retry_after_milliseconds
from apps.linkedin_posts.services.organization import OrganizationVerifier
from apps.linkedin_posts.services.pexels import PexelsService
from apps.linkedin_posts.services.publisher import OrganizationPublisher, escape_linkedin_little_text
from apps.linkedin_posts.services.posts import LinkedInPostService
from apps.publications.schemas import PublicationUpdate


# Return a verified organization without calling the live provider in publisher tests.
class FakeVerifier:
    def __init__(self, linkedin):
        self.linkedin = linkedin
        self.organization_urn = "urn:li:organization:123"

    async def verify(self):
        return OrganizationVerification(
            identity={"subject": "member", "urn": "urn:li:person:member"},
            organization={"urn": self.organization_urn, "name": "VietQuant"},
            roles=[{"role": "ADMINISTRATOR", "state": "APPROVED"}],
            scopes=["rw_organization_admin", "w_organization_social"],
            permissions={"organizationRead": True, "organizationWrite": True, "imageUpload": True, "commentCreate": True},
            readyForOrganicPosting=True,
        )


# Verify the source-proven Little Text escaping and real-hashtag preservation.
def test_little_text_escape_preserves_hashtags():
    assert escape_linkedin_little_text("#VietQuant [quant] @team") == "#VietQuant \\[quant\\] \\@team"


# Verify Retry-After supports both seconds and HTTP date forms.
def test_retry_after_parsing():
    assert retry_after_milliseconds(httpx.Headers({"retry-after": "2"})) == 2000
    assert retry_after_milliseconds(httpx.Headers({"retry-after": "garbage"})) is None


# Verify actual GIF bytes are accepted while unsupported bytes are rejected.
def test_image_validation_uses_binary_signature():
    image = validate_image_bytes(b"GIF89a" + b"\x02\x00\x03\x00")
    assert (image.media_type, image.width, image.height) == ("image/gif", 2, 3)
    with pytest.raises(LinkedInError, match="PNG, JPEG, or GIF"):
        validate_image_bytes(b"not-an-image")


# Verify a final text create uses the expected payload and captures x-restli-id.
def test_text_publish_payload_and_id():
    captured = {}

    # Record the outgoing request and emulate a successful LinkedIn post creation.
    def handler(request):
        captured["json"] = json.loads(request.content)
        return httpx.Response(201, headers={"x-restli-id": "urn:li:share:1"}, request=request)

    # Own and close the injected LinkedIn client around the post call.
    # Own and close the injected LinkedIn client around the comment call.
    async def run():
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        linkedin = LinkedInClient("token", "202601", client)
        try:
            return await OrganizationPublisher(FakeVerifier(linkedin)).publish_text("Hello [world] #VietQuant")
        finally:
            await client.aclose()

    assert asyncio.run(run()) == {"post_id": "urn:li:share:1"}
    assert captured["json"]["author"] == "urn:li:organization:123"
    assert captured["json"]["commentary"] == "Hello \\[world\\] #VietQuant"
    assert captured["json"]["distribution"]["feedDistribution"] == "MAIN_FEED"


# Encode the post URN in the Social Actions path and accept any successful response status.
@pytest.mark.parametrize("status", [200, 201])
def test_organization_comment_payload_and_id(status):
    captured = {}

    # Record the outgoing comment request.
    def handler(request):
        captured["url"] = str(request.url)
        captured["json"] = json.loads(request.content)
        return httpx.Response(status, headers={"x-restli-id": "comment-1"}, request=request)

    async def run():
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        linkedin = LinkedInClient("token", "202601", client)
        try:
            return await OrganizationPublisher(FakeVerifier(linkedin)).create_organization_comment(
                "urn:li:share:123", "Đọc bài đầy đủ:\nhttps://quant.vn/blog/latency"
            )
        finally:
            await client.aclose()

    assert asyncio.run(run()) == {"comment_id": "comment-1"}
    assert "urn%3Ali%3Ashare%3A123/comments" in captured["url"]
    assert captured["json"]["actor"] == "urn:li:organization:123"


# Verify ambiguous final-create server failures are never marked safe to retry.
def test_final_create_5xx_has_duplicate_risk():
    error = error_for_response(httpx.Response(503), "post creation", final_create=True)
    assert error.code == "linkedin_unavailable"
    assert error.duplicate_risk is True
    assert error.retryable is False


# Normalize provider status codes without leaking response bodies or credentials.
@pytest.mark.parametrize(("status", "code", "retryable"), [(401, "invalid_or_expired_token", False), (403, "insufficient_permission", False), (429, "rate_limited", True), (503, "linkedin_unavailable", True)])
def test_linkedin_error_mapping(status, code, retryable):
    error = error_for_response(httpx.Response(status, headers={"retry-after": "3"}), "verification")
    assert (error.code, error.retryable) == (code, retryable)
    assert error.retry_after_ms == (3000 if status == 429 else None)


# Mark an unknown final-create network outcome as duplicate risk and never safe retry.
def test_final_create_network_failure_is_ambiguous():
    def handler(request):
        raise httpx.ConnectError("offline", request=request)

    async def run():
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        try:
            return await LinkedInClient("token", "202601", client).request("POST", "https://api.linkedin.com/rest/posts", stage="post creation", final_create=True)
        finally:
            await client.aclose()

    with pytest.raises(LinkedInError) as error:
        asyncio.run(run())
    assert error.value.duplicate_risk is True
    assert error.value.retryable is False


# Verify target combinations reject the impossible no-channel and link-only states.
def test_publication_targets_require_valid_web_link_policy():
    with pytest.raises(ValueError):
        PublicationUpdate(publishWeb=False, publishLinkedin=False)
    with pytest.raises(ValueError):
        PublicationUpdate(publishWeb=False, publishLinkedin=True, linkedinIncludeWebLink=True)
    assert PublicationUpdate(publishWeb=True, publishLinkedin=True).linkedinLinkPlacement.value == "NONE"


# Normalize preset, custom, and blank audience values for both AI endpoints.
@pytest.mark.parametrize("schema", [IndependentDraftRequest, TopicProposalRequest])
@pytest.mark.parametrize(
    ("value", "expected"),
    [("systems", "systems"), ("  quant researchers  ", "quant researchers"), ("   ", None)],
)
def test_audience_normalization(schema, value, expected):
    required = {"topic": "Latency"} if schema is IndependentDraftRequest else {}

    assert schema(**required, targetAudience=value).targetAudience == expected


# Verify the unmodified source template is populated before it reaches Gemini.
def test_generation_prompt_has_no_unresolved_placeholders():
    prompt = _generation_prompt(
        LinkedInArticleSource(
            title="Latency trong trading",
            content="Trusted article content",
            category="TECHNOLOGY",
            tags=["latency"],
            mode=LinkedInMode.SUMMARY,
        )
    )

    assert "Latency trong trading" in prompt
    assert "{{" not in prompt


# Build a strict generated post for schema and generator behavior checks.
def generated_post(**updates):
    values = {
        "style": "observation",
        "openingType": "statement",
        "audience": "systems",
        "hookSource": "production bug",
        "connection": Connection(**{"from": "production bug", "to": "live trading"}),
        "insight": "Production differs from tests",
        "content": "Backtest là môi trường test.\n\nCùng VietQuant tìm hiểu thêm.",
        "hashtags": ["#VietQuant", "#Systems"],
        "media": MediaPlan(mode=MediaMode.NONE, images=[]),
        "requiresHumanFactCheck": False,
        "factCheckNotes": [],
    }
    values.update(updates)
    return GeneratedPost(**values)


# Preserve source behavior by extracting, de-duplicating, and rendering hashtags once.
def test_generated_hashtags_are_published_once():
    post = generated_post(content="Backtest khác production. #Systems\n\nCùng VietQuant tìm hiểu thêm.", hashtags=["Systems", "#VietQuant"])

    assert "#Systems" not in post.content
    assert post.hashtags == ["#VietQuant", "#Systems"]
    assert render_generated_post(post).endswith("#VietQuant #Systems")


# Reject duplicate image slots before media can reach candidate resolution.
def test_media_plan_requires_unique_slots():
    image = ImagePlan(slotId="hero", order=1, role="context", preferredSource="pexels", concept="server room", searchKeywords=["server rack", "datacenter"], altTextDraft="Server racks")
    with pytest.raises(ValueError, match="slot IDs"):
        MediaPlan(mode=MediaMode.MULTI, images=[image, image.model_copy(update={"order": 2})])


# Reject an image at LinkedIn's exact exclusive pixel ceiling.
def test_image_validation_rejects_oversized_dimensions():
    oversized_gif = b"GIF89a" + b"\xff\xff\xff\xff"
    with pytest.raises(LinkedInError, match="fewer than"):
        validate_image_bytes(oversized_gif)


# Retry invalid structured drafts while keeping the source prompts and final hashtags.
def test_summary_retries_invalid_cta_and_renders_hashtags():
    class Provider:
        def __init__(self):
            self.calls = 0

        async def generate(self, system, prompt):
            self.calls += 1
            assert "{{" not in prompt
            return generated_post(content="Backtest khác production.\n\nKết thúc chung chung.") if self.calls == 1 else generated_post()

        async def review(self, post):
            return FactualReview(requiresHumanFactCheck=False, factCheckNotes=[])

    provider = Provider()
    result = asyncio.run(LinkedInDraftGenerator(provider).summary(LinkedInArticleSource(title="Backtest", content="Trusted content", category="TECHNOLOGY", mode=LinkedInMode.SUMMARY)))

    assert provider.calls == 2
    assert result.content.endswith("#VietQuant #Systems")


# Verify Company Page identity, scope, role, and organization lookup as one read-only flow.
def test_organization_verification_happy_path():
    def handler(request):
        if request.url.path == "/v2/userinfo":
            return httpx.Response(200, json={"sub": "member"}, request=request)
        if request.url.path == "/oauth/v2/introspectToken":
            return httpx.Response(200, json={"active": True, "client_id": "client", "scope": "rw_organization_admin w_organization_social w_organization_social_feed"}, request=request)
        if request.url.path == "/rest/organizationAcls":
            return httpx.Response(200, json={"elements": [{"organization": "urn:li:organization:123", "role": "ADMINISTRATOR", "state": "APPROVED", "roleAssignee": "urn:li:person:member"}]}, request=request)
        return httpx.Response(200, json={"id": 123, "localizedName": "VietQuant"}, request=request)

    async def run():
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        try:
            return await OrganizationVerifier("token", "client", "secret", "urn:li:organization:123", "202601", client).verify()
        finally:
            await client.aclose()

    result = asyncio.run(run())
    assert result.readyForOrganicPosting is True
    assert result.permissions["imageUpload"] is True
    assert result.permissions["commentCreate"] is True


# Preserve exact multi-image ordering from upload initialization through post creation.
def test_multi_image_publish_preserves_order():
    initialized, posted = [], {}

    def handler(request):
        if request.url.path == "/rest/images":
            index = len(initialized) + 1
            initialized.append(index)
            return httpx.Response(200, json={"value": {"uploadUrl": f"https://www.linkedin.com/upload/{index}", "image": f"urn:li:image:{index}"}}, request=request)
        if request.method == "PUT":
            return httpx.Response(201, request=request)
        posted.update(json.loads(request.content))
        return httpx.Response(201, headers={"x-restli-id": "urn:li:share:multi"}, request=request)

    async def run():
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        linkedin = LinkedInClient("token", "202601", client)
        image = ValidatedImage(media_type="image/gif", width=1, height=1, bytes=b"GIF89a\x01\x00\x01\x00")
        try:
            return await OrganizationPublisher(FakeVerifier(linkedin)).publish_multi_image("Post", [(image, "first"), (image, "second")])
        finally:
            await client.aclose()

    result = asyncio.run(run())
    assert result["image_urns"] == ["urn:li:image:1", "urn:li:image:2"]
    assert [item["altText"] for item in posted["content"]["multiImage"]["images"]] == ["first", "second"]


# Rank concrete Pexels metadata instead of taking the provider's first result.
def test_pexels_search_ranks_relevant_candidates():
    def handler(request):
        return httpx.Response(200, json={"photos": [{"id": 1, "url": "https://www.pexels.com/photo/ocean-1", "photographer": "A", "alt": "ocean", "src": {"large": "https://images.pexels.com/photos/1.jpg"}}, {"id": 2, "url": "https://www.pexels.com/photo/server-rack-2", "photographer": "B", "alt": "server rack datacenter", "src": {"large": "https://images.pexels.com/photos/2.jpg"}}]}, request=request)

    async def run():
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        try:
            return await PexelsService("key", client).search(["server rack"])
        finally:
            await client.aclose()

    assert [item.providerId for item in asyncio.run(run())] == ["2"]


# Reject client-supplied non-Pexels image hosts before any network request.
def test_pexels_download_rejects_untrusted_host():
    candidate = PexelsCandidate(providerId="1", sourceUrl="https://www.pexels.com/photo/1", imageUrl="https://example.com/image.jpg", photographer="A", attribution="Photo by A on Pexels", altText="Image")

    async def run():
        client = httpx.AsyncClient()
        try:
            return await PexelsService("key", client).download(candidate)
        finally:
            await client.aclose()

    with pytest.raises(LinkedInError, match="unexpected URL"):
        asyncio.run(run())


# CUSTOM mode is administrator-owned and never invokes the generator.
def test_custom_mode_is_never_generated():
    with pytest.raises(LinkedInError, match="administrator"):
        asyncio.run(LinkedInDraftGenerator(object()).draft(LinkedInArticleSource(title="Manual", content="Manual text", category="TECHNOLOGY", mode=LinkedInMode.CUSTOM)))


# Accept only server-owned LinkedIn object keys for uploaded media.
def test_uploaded_media_rejects_paths_outside_linkedin_prefix():
    with pytest.raises(ValueError):
        UploadedMedia(objectKey="../private/image.png", fileName="image.png", altText="Image")


# Return contract-ready metadata and reject WebP before storing a LinkedIn upload.
def test_linkedin_upload_contract(monkeypatch):
    monkeypatch.setattr(StorageService, "upload_image", lambda *_args, **_kwargs: "linkedin/image.gif")
    image = UploadFile(filename="market-chart.gif", file=BytesIO(b"GIF89a\x01\x00\x01\x00"), headers=Headers({"content-type": "image/gif"}))

    result = upload_media(image, "admin")

    assert result == {
        "provider": "upload",
        "objectKey": "linkedin/image.gif",
        "fileName": "market-chart.gif",
        "altText": "market chart",
        "order": 1,
        "origin": "manual",
    }
    webp = UploadFile(filename="chart.webp", file=BytesIO(b"webp"), headers=Headers({"content-type": "image/webp"}))
    with pytest.raises(HTTPException) as error:
        upload_media(webp, "admin")
    assert error.value.status_code == 415

    spoofed = UploadFile(filename="chart.png", file=BytesIO(b"GIF89a\x01\x00\x01\x00"), headers=Headers({"content-type": "image/png"}))
    with pytest.raises(HTTPException) as error:
        upload_media(spoofed, "admin")
    assert error.value.status_code == 415

    monkeypatch.setattr("apps.linkedin_posts.routers.settings.MEDIA_MAX_UPLOAD_MB", 0)
    oversized = UploadFile(filename="chart.gif", file=BytesIO(b"GIF89a\x01\x00\x01\x00"), headers=Headers({"content-type": "image/gif"}))
    with pytest.raises(HTTPException) as error:
        upload_media(oversized, "admin")
    assert error.value.status_code == 413


# Reject invalid provider, alt text, and media cardinality at the API boundary.
def test_linkedin_media_contract_rejects_invalid_payloads():
    with pytest.raises(ValueError):
        UploadedMedia(objectKey="linkedin/image.png", fileName="image.png", altText="")
    with pytest.raises(ValueError):
        LinkedInPostCreate(
            content="Post",
            mediaMode=MediaMode.SINGLE,
            media=[{"provider": "remote", "imageUrl": "https://example.com/image.png"}],
        )
    with pytest.raises(HTTPException) as error:
        LinkedInPostService.save_reviewed(
            LinkedInPostCreate(content="Post", mediaMode=MediaMode.SINGLE, media=[]),
        )
    assert error.value.status_code == 422


# Resolve mixed uploaded and Pexels assets in their reviewed order.
def test_mixed_media_resolves_to_validated_images(monkeypatch):
    uploaded_bytes = b"GIF89a\x01\x00\x01\x00"
    monkeypatch.setattr(StorageService, "read_image_bytes", lambda *_args, **_kwargs: uploaded_bytes)

    # Return deterministic Pexels bytes without making a network request.
    async def download(_self, _candidate):
        return ValidatedImage(media_type="image/gif", width=2, height=2, bytes=b"pexels")

    monkeypatch.setattr(PexelsService, "download", download)
    post = SimpleNamespace(media=[
        {"provider": "pexels", "providerId": "1", "sourceUrl": "https://www.pexels.com/photo/1", "imageUrl": "https://images.pexels.com/photos/1.jpg", "photographer": "A", "attribution": "Photo by A on Pexels", "altText": "Pexels", "order": 2},
        {"provider": "upload", "objectKey": "linkedin/image.gif", "fileName": "image.gif", "altText": "Upload", "order": 1},
    ])

    images = asyncio.run(LinkedInPostService._images(post))

    assert [(image.width, alt) for image, alt in images] == [(1, "Upload"), (2, "Pexels")]


# Persist every editable field accepted by the LinkedIn update contract.
def test_linkedin_update_persists_complete_editor_payload(monkeypatch):
    post = SimpleNamespace(
        id="post-1", content="Old", topic="Old topic", media_mode="none", media=[],
        fact_check={}, generation={}, source_type="CUSTOM", status=LinkedInPostStatus.DRAFT.value,
        provider_post_id=None, published_at=None, last_error=None, manually_edited=False,
        deleted_at=None, created_at=None, modified_at=None,
    )
    captured = {}
    monkeypatch.setattr(LinkedInPostService, "get", classmethod(lambda cls, _post_id: post))

    # Apply the captured model update to the fake record returned to serialization.
    def update(_post_id, **values):
        captured.update(values)
        for key, value in values.items():
            setattr(post, key, value)
        return post

    monkeypatch.setattr("apps.linkedin_posts.services.posts.LinkedInPost.update", update)
    data = LinkedInPostUpdate(
        topic="New topic", content="New content", factCheck={"requiresHumanFactCheck": False},
        generation={"style": "technical"}, sourceType=LinkedInSourceType.INDEPENDENT_AI,
    )

    result = LinkedInPostService.update("post-1", data)

    assert result["topic"] == "New topic"
    assert captured["fact_check"] == {"requiresHumanFactCheck": False}
    assert captured["generation"] == {"style": "technical"}
    assert captured["source_type"] == "INDEPENDENT_AI"
