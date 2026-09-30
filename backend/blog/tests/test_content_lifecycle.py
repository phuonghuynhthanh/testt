import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from apps.blogs import schemas as blog_schemas
from apps.blogs.models import Blog
from apps.blogs.services.blog import BlogServices
from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.models import LinkedInPost
from apps.linkedin_posts.schemas import (
    LinkedInPostAction,
    LinkedInPostCreate,
    LinkedInPostStatus,
)
from apps.linkedin_posts.services.posts import LinkedInPostService


# Build a standalone post state accepted by the API serializer.
def post_state(**updates):
    values = {
        "id": "post-1",
        "content": "Reviewed",
        "media_mode": "none",
        "media": [],
        "fact_check": None,
        "generation": None,
        "source_type": "CUSTOM",
        "status": LinkedInPostStatus.DRAFT.value,
        "provider_post_id": None,
        "published_at": None,
        "last_error": None,
        "manually_edited": True,
        "created_at": None,
        "modified_at": datetime.now(timezone.utc),
    }
    values.update(updates)
    return SimpleNamespace(**values)


# Verify Web AI returns a complete preview without entering Blog persistence.
def test_web_ai_generation_is_preview_only(monkeypatch):
    # Return deterministic generated Markdown.
    async def markdown(_):
        return SimpleNamespace(blog_content="# Reviewed preview")

    # Return deterministic generated SEO metadata.
    async def seo(*_):
        return {"description": "Description", "keywords": ["latency"]}

    # Return a deterministic generated tag.
    async def tag(**_):
        return "quant"

    monkeypatch.setattr(
        "apps.blogs.services.blog.GeminiAiService.generate_blog_markdown", markdown
    )
    monkeypatch.setattr(
        "apps.blogs.services.blog.GeminiAiService.generate_seo_keywords_and_description",
        seo,
    )
    monkeypatch.setattr(
        "apps.blogs.services.blog.GeminiAiService.generate_tag_base_on_title", tag
    )
    monkeypatch.setattr(
        BlogServices,
        "create_blog",
        classmethod(
            lambda cls, *args, **kwargs: pytest.fail("generation must not persist")
        ),
    )

    result = asyncio.run(
        BlogServices.ai_generate_blog_markdown_with_title("Latency", "KNOWLEDGE_BASE")
    )

    assert result["content"] == "# Reviewed preview"
    assert result["link_post"] == "latency"


# Verify explicit Web create actions own the resulting public state.
@pytest.mark.parametrize(
    "action, expected",
    [
        (blog_schemas.BlogCreateAction.SAVE_PENDING, blog_schemas.BlogState.PENDING),
        (blog_schemas.BlogCreateAction.PUBLISH_NOW, blog_schemas.BlogState.APPROVED),
    ],
)
def test_reviewed_web_create_action_controls_state(monkeypatch, action, expected):
    captured = {}
    data = blog_schemas.BlogCreate(
        tag="quant",
        title="Latency",
        link_post="latency",
        content="Reviewed",
        category=blog_schemas.BlogCategory.KNOWLEDGE,
        seo=blog_schemas.SEODataSchema(
            title="Latency",
            description="Description",
            url="https://example.com/blog/latency",
            keywords=[],
        ),
    )
    monkeypatch.setattr(
        Blog, "filter", classmethod(lambda cls, _: SimpleNamespace(first=lambda: None))
    )
    monkeypatch.setattr(
        Blog,
        "create",
        classmethod(
            lambda cls, **values: captured.update(values) or SimpleNamespace(**values)
        ),
    )

    BlogServices.create_blog(data, action=action)

    assert captured["state"] == expected


# Verify a concurrent publish loser observes PUBLISHING and never calls the provider.
def test_atomic_publish_claim_prevents_double_provider_call(monkeypatch):
    initial = post_state()
    publishing = post_state(status=LinkedInPostStatus.PUBLISHING.value)
    states = iter([initial, publishing])
    monkeypatch.setattr(
        LinkedInPostService, "get", classmethod(lambda cls, _: next(states))
    )
    monkeypatch.setattr(
        LinkedInPostService, "_claim_publish", staticmethod(lambda _: False)
    )
    monkeypatch.setattr(
        "apps.linkedin_posts.services.posts.OrganizationPublisher",
        lambda *_: pytest.fail("provider must not be constructed"),
    )

    result = asyncio.run(LinkedInPostService.publish("post-1"))

    assert result["status"] == LinkedInPostStatus.PUBLISHING.value


# Verify only stale interrupted PUBLISHING state moves to human review.
def test_stale_publishing_requires_review(monkeypatch):
    post = post_state(
        status=LinkedInPostStatus.PUBLISHING.value,
        modified_at=datetime.now(timezone.utc) - timedelta(minutes=6),
    )

    # Apply the requested update to the in-memory state used by this unit test.
    def update(cls, _, **values):
        for key, value in values.items():
            setattr(post, key, value)
        return post

    monkeypatch.setattr(LinkedInPost, "update", classmethod(update))

    result = LinkedInPostService._publishing_state(post)

    assert result["status"] == LinkedInPostStatus.REVIEW_REQUIRED.value
    assert result["lastError"]["duplicateRisk"] is True


# Run one claimed publish through a deterministic provider failure.
def publish_with_error(monkeypatch, provider_error):
    initial = post_state()
    publishing = post_state(status=LinkedInPostStatus.PUBLISHING.value)
    states = iter([initial, publishing])

    # Record final state updates after the mocked provider rejects safely.
    def update(cls, _, **values):
        for key, value in values.items():
            setattr(publishing, key, value)
        return publishing

    class Publisher:
        # Expose the closeable provider boundary expected by the service.
        def __init__(self, _):
            self.linkedin = SimpleNamespace(close=self.close)

        # Close the fake provider without side effects.
        async def close(self):
            return None

        # Raise the requested safe or ambiguous provider outcome.
        async def publish_text(self, _):
            raise provider_error

    monkeypatch.setattr(
        LinkedInPostService, "get", classmethod(lambda cls, _: next(states))
    )
    monkeypatch.setattr(
        LinkedInPostService, "_claim_publish", staticmethod(lambda _: True)
    )
    monkeypatch.setattr(
        LinkedInPostService,
        "_images",
        staticmethod(lambda _: asyncio.sleep(0, result=[])),
    )
    monkeypatch.setattr(LinkedInPost, "update", classmethod(update))
    monkeypatch.setattr(
        "apps.linkedin_posts.services.posts.OrganizationVerifier", lambda *_: object()
    )
    monkeypatch.setattr(
        "apps.linkedin_posts.services.posts.OrganizationPublisher", Publisher
    )

    return asyncio.run(LinkedInPostService.publish("post-1"))


# Verify a safe provider rejection remains retryable as FAILED.
def test_safe_provider_failure_is_retryable(monkeypatch):
    result = publish_with_error(
        monkeypatch, LinkedInError("rate_limited", "retry later", retryable=True)
    )

    assert result["status"] == LinkedInPostStatus.FAILED.value


# Verify an unknown provider outcome requires review and blocks automatic retry.
def test_ambiguous_provider_failure_requires_review(monkeypatch):
    result = publish_with_error(monkeypatch, RuntimeError("connection lost"))

    assert result["status"] == LinkedInPostStatus.REVIEW_REQUIRED.value
    assert result["lastError"]["duplicateRisk"] is True


# Verify REVIEW_REQUIRED cannot enter the automatic retry path.
def test_review_required_retry_is_blocked(monkeypatch):
    post = post_state(status=LinkedInPostStatus.REVIEW_REQUIRED.value)
    monkeypatch.setattr(LinkedInPostService, "get", classmethod(lambda cls, _: post))

    with pytest.raises(HTTPException) as error:
        asyncio.run(LinkedInPostService.publish("post-1", retry=True))

    assert error.value.status_code == 409


# Verify a published record is idempotent and bypasses provider construction.
def test_published_post_is_idempotent(monkeypatch):
    post = post_state(
        status=LinkedInPostStatus.PUBLISHED.value,
        provider_post_id="urn:li:share:1",
    )
    monkeypatch.setattr(LinkedInPostService, "get", classmethod(lambda cls, _: post))
    monkeypatch.setattr(
        "apps.linkedin_posts.services.posts.OrganizationPublisher",
        lambda *_: pytest.fail("provider must not be constructed"),
    )

    result = asyncio.run(LinkedInPostService.publish("post-1"))

    assert result["providerPostId"] == "urn:li:share:1"


# Verify PUBLISH_NOW persists reviewed content before entering the provider path.
def test_independent_publish_now_saves_before_publish(monkeypatch):
    post = post_state()
    events = []
    request = LinkedInPostCreate(
        content="Reviewed", action=LinkedInPostAction.PUBLISH_NOW
    )
    monkeypatch.setattr(
        LinkedInPostService,
        "save_reviewed",
        classmethod(lambda cls, _: events.append("save") or post),
    )

    # Record configuration validation before local persistence.
    async def validate():
        events.append("validate")

    # Record provider entry after the local save.
    async def publish(cls, _):
        events.append("publish")
        return LinkedInPostService.serialize(post)

    monkeypatch.setattr(
        LinkedInPostService, "validate_configuration", staticmethod(validate)
    )
    monkeypatch.setattr(LinkedInPostService, "publish", classmethod(publish))

    asyncio.run(LinkedInPostService.create(request))

    assert events == ["validate", "save", "publish"]
