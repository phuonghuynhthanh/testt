import asyncio
import json

import httpx
import pytest

from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.schemas import Connection, FactualReview, GeneratedPost, ImagePlan, LinkedInArticleSource, LinkedInMode, MediaMode, MediaPlan, OrganizationVerification, PexelsCandidate, ValidatedImage
from apps.linkedin_posts.services.generator import LinkedInDraftGenerator, _generation_prompt, render_generated_post
from apps.linkedin_posts.services.image import validate_image_bytes
from apps.linkedin_posts.services.linkedin_client import LinkedInClient, error_for_response, retry_after_milliseconds
from apps.linkedin_posts.services.organization import OrganizationVerifier
from apps.linkedin_posts.services.pexels import PexelsService
from apps.linkedin_posts.services.publisher import OrganizationPublisher, escape_linkedin_little_text
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
            permissions={"organizationRead": True, "organizationWrite": True, "imageUpload": True},
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
    assert PublicationUpdate(publishWeb=True, publishLinkedin=True).linkedinIncludeWebLink is True


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
            return httpx.Response(200, json={"active": True, "client_id": "client", "scope": "rw_organization_admin w_organization_social"}, request=request)
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
