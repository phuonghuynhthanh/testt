import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, inspect, text

from apps.blogs.schemas import BlogState
from apps.linkedin_posts.exceptions import LinkedInError
from apps.publications.schemas import LinkedInContentUpdate, LinkedInMode, PublicationStatus, PublicationUpdate
from apps.publications.services import PublicationService
from apps.publications.migrations import apply as apply_publication_migration


# Build a complete mutable publication state for orchestration tests.
def publication_state(**updates):
    values = {
        "id": "publication-1",
        "blog_id": "blog-1",
        "publish_web": True,
        "publish_linkedin": True,
        "linkedin_mode": "CUSTOM",
        "linkedin_content": "A reviewed draft",
        "linkedin_include_web_link": False,
        "linkedin_status": PublicationStatus.READY.value,
        "linkedin_post_id": None,
        "linkedin_published_at": None,
        "linkedin_error": None,
        "linkedin_media": [],
        "linkedin_fact_check": None,
        "linkedin_generation": None,
        "linkedin_manually_edited": False,
    }
    values.update(updates)
    return SimpleNamespace(**values)


# Verify Web is approved before the one LinkedIn post is attempted and a link is appended once.
def test_web_then_linkedin_publish_order(monkeypatch):
    blog = SimpleNamespace(id="blog-1", link_post="latency", state="PENDING")
    publication = SimpleNamespace(
        id="publication-1",
        blog_id="blog-1",
        publish_web=True,
        publish_linkedin=True,
        linkedin_mode="CUSTOM",
        linkedin_content="A reviewed draft",
        linkedin_include_web_link=True,
        linkedin_status=PublicationStatus.READY.value,
        linkedin_post_id=None,
        linkedin_published_at=None,
        linkedin_error=None,
        linkedin_media=[],
        linkedin_fact_check=None,
    )
    saved = []

    # Record commits as the orchestration flow changes each channel state.
    def save(cls, value):
        saved.append(value)
        return value

    # Emulate a provider and assert the Website channel has completed first.
    class Publisher:
        def __init__(self):
            self.linkedin = SimpleNamespace(close=self.close, validate=lambda: None)

        async def close(self):
            return None

        async def publish_text(self, content):
            assert blog.state == BlogState.APPROVED
            assert content.count("https://cms.example/blog/latency") == 1
            return {"post_id": "urn:li:share:1"}

    monkeypatch.setattr("config.settings.DOMAIN_URL", "https://cms.example")
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))
    monkeypatch.setattr(PublicationService, "_save", classmethod(save))
    monkeypatch.setattr(PublicationService, "_images", classmethod(lambda cls, _: asyncio.sleep(0, result=[])))
    monkeypatch.setattr(PublicationService, "_publisher", classmethod(lambda cls: Publisher()))

    result = asyncio.run(PublicationService.publish("blog-1"))

    assert saved[0] is blog
    assert result["linkedinStatus"] == PublicationStatus.PUBLISHED.value
    assert result["linkedinPostId"] == "urn:li:share:1"


# Verify already-published LinkedIn state is idempotent and never invokes a provider.
def test_published_linkedin_is_idempotent(monkeypatch):
    publication = SimpleNamespace(
        id="publication-1", blog_id="blog-1", publish_web=True, publish_linkedin=True,
        linkedin_mode="CUSTOM", linkedin_content="draft", linkedin_include_web_link=False,
        linkedin_status=PublicationStatus.PUBLISHED.value, linkedin_post_id="urn:li:share:1",
        linkedin_published_at=None, linkedin_error=None, linkedin_media=[], linkedin_fact_check=None,
    )
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: SimpleNamespace(state=BlogState.APPROVED)))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))

    result = asyncio.run(PublicationService.publish("blog-1"))

    assert result["linkedinPostId"] == "urn:li:share:1"


# Keep external publication history immutable when a channel is disabled and re-enabled.
def test_channel_toggle_cannot_repost_published_linkedin(monkeypatch):
    publication = publication_state(linkedin_status=PublicationStatus.PUBLISHED.value, linkedin_post_id="urn:li:share:1")
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: SimpleNamespace(state=BlogState.APPROVED)))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))
    monkeypatch.setattr(PublicationService, "_save", classmethod(lambda cls, value: value))

    PublicationService.update("blog-1", PublicationUpdate(publishWeb=True, publishLinkedin=False, linkedinMode=LinkedInMode.CUSTOM))
    PublicationService.update("blog-1", PublicationUpdate(publishWeb=True, publishLinkedin=True, linkedinMode=LinkedInMode.CUSTOM))

    assert publication.linkedin_status == PublicationStatus.PUBLISHED.value
    assert asyncio.run(PublicationService.publish("blog-1"))["linkedinPostId"] == "urn:li:share:1"


# Treat a confirmed 201 as idempotent even when LinkedIn omits x-restli-id.
def test_published_without_post_id_is_idempotent(monkeypatch):
    publication = publication_state(linkedin_status=PublicationStatus.PUBLISHED.value, linkedin_post_id=None)
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: SimpleNamespace(state=BlogState.APPROVED)))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))
    monkeypatch.setattr(PublicationService, "_publisher", classmethod(lambda cls: pytest.fail("provider must not be called")))

    assert asyncio.run(PublicationService.publish("blog-1"))["linkedinStatus"] == PublicationStatus.PUBLISHED.value


# Complete a newly selected Web channel without reposting an existing LinkedIn post.
def test_published_linkedin_can_publish_web_later(monkeypatch):
    blog = SimpleNamespace(id="blog-1", state=BlogState.PENDING)
    publication = publication_state(linkedin_status=PublicationStatus.PUBLISHED.value, linkedin_post_id="urn:li:share:1")
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))
    monkeypatch.setattr(PublicationService, "_save", classmethod(lambda cls, value: value))
    monkeypatch.setattr(PublicationService, "_publisher", classmethod(lambda cls: pytest.fail("LinkedIn must not be reposted")))

    asyncio.run(PublicationService.publish("blog-1"))

    assert blog.state == BlogState.APPROVED


# Reject invalid LinkedIn configuration before making the Blog public.
def test_linkedin_prevalidation_happens_before_web_publish(monkeypatch):
    blog = SimpleNamespace(id="blog-1", link_post="latency", state=BlogState.PENDING)
    publication = publication_state(linkedin_include_web_link=True)
    monkeypatch.setattr("config.settings.DOMAIN_URL", "https://cms.example")
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))
    monkeypatch.setattr(PublicationService, "_publisher", classmethod(lambda cls: (_ for _ in ()).throw(LinkedInError("configuration_error", "bad config"))))

    with pytest.raises(HTTPException) as error:
        asyncio.run(PublicationService.publish("blog-1"))

    assert error.value.status_code == 422
    assert blog.state == BlogState.PENDING
    assert publication.linkedin_status == PublicationStatus.READY.value


# Require every generated media slot to be replaced by validated selected metadata.
def test_unselected_media_plan_blocks_publish():
    publication = publication_state(linkedin_media={"mode": "single-image", "items": [{"slotId": "hero", "order": 1, "searchKeywords": ["server rack", "datacenter"]}]})
    with pytest.raises(LinkedInError, match="Every planned image"):
        asyncio.run(PublicationService._images(publication))


# Prevent a planned multi-image post from silently becoming a single-image post.
def test_media_selection_must_match_planned_mode(monkeypatch):
    publication = publication_state(linkedin_mode="SUMMARY", linkedin_media={"mode": "multi-image", "items": [{"slotId": "one"}, {"slotId": "two"}]})
    candidate = {"providerId": "1", "sourceUrl": "https://www.pexels.com/photo/1", "imageUrl": "https://images.pexels.com/photos/1.jpg", "photographer": "A", "attribution": "Photo by A on Pexels", "altText": "Image", "order": 1}
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: SimpleNamespace()))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))

    with pytest.raises(HTTPException) as error:
        PublicationService.save_custom("blog-1", LinkedInContentUpdate(media=[candidate]))

    assert error.value.status_code == 422


# Preserve successful Web publication while recording a safe LinkedIn failure for retry.
def test_linkedin_failure_does_not_roll_back_web(monkeypatch):
    blog = SimpleNamespace(id="blog-1", link_post="latency", state=BlogState.PENDING)
    publication = publication_state()

    class Publisher:
        def __init__(self):
            self.linkedin = SimpleNamespace(validate=lambda: None, close=self.close)

        async def close(self):
            return None

        async def publish_text(self, _):
            raise LinkedInError("linkedin_unavailable", "retry", retryable=True)

    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))
    monkeypatch.setattr(PublicationService, "_save", classmethod(lambda cls, value: value))
    monkeypatch.setattr(PublicationService, "_images", classmethod(lambda cls, _: asyncio.sleep(0, result=[])))
    monkeypatch.setattr(PublicationService, "_publisher", classmethod(lambda cls: Publisher()))

    result = asyncio.run(PublicationService.publish("blog-1"))

    assert blog.state == BlogState.APPROVED
    assert result["linkedinStatus"] == PublicationStatus.FAILED.value


# Convert an interrupted in-flight status to human review instead of retrying blindly.
def test_interrupted_publish_requires_human_review(monkeypatch):
    publication = publication_state(linkedin_status=PublicationStatus.PUBLISHING.value)
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: SimpleNamespace()))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))
    monkeypatch.setattr(PublicationService, "_save", classmethod(lambda cls, value: value))

    with pytest.raises(HTTPException) as error:
        asyncio.run(PublicationService.publish("blog-1"))

    assert error.value.status_code == 409
    assert publication.linkedin_status == PublicationStatus.REVIEW_REQUIRED.value
    assert publication.linkedin_error["duplicateRisk"] is True


# Upgrade an existing publication table and backfill legacy Blogs without data loss.
def test_publication_migration_backfills_legacy_blogs(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'cms.db'}")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE blogs (id VARCHAR PRIMARY KEY)"))
        connection.execute(text("CREATE TABLE post_publications (id VARCHAR PRIMARY KEY, blog_id VARCHAR NOT NULL UNIQUE, publish_web BOOLEAN NOT NULL, publish_linkedin BOOLEAN NOT NULL, linkedin_mode VARCHAR NOT NULL, linkedin_content VARCHAR, linkedin_include_web_link BOOLEAN NOT NULL, linkedin_status VARCHAR NOT NULL, linkedin_post_id VARCHAR, linkedin_published_at DATETIME, linkedin_error JSON, linkedin_media JSON, linkedin_fact_check JSON, linkedin_manually_edited BOOLEAN NOT NULL, created_at DATETIME, modified_at DATETIME)"))
        connection.execute(text("INSERT INTO blogs (id) VALUES ('legacy-blog')"))

    apply_publication_migration(engine)

    assert "linkedin_generation" in {column["name"] for column in inspect(engine).get_columns("post_publications")}
    with engine.connect() as connection:
        row = connection.execute(text("SELECT publish_web, publish_linkedin FROM post_publications WHERE blog_id='legacy-blog'")).one()
    assert tuple(row) == (1, 0)


# Publish Web only without constructing or calling a LinkedIn provider.
def test_web_only_never_calls_linkedin(monkeypatch):
    blog = SimpleNamespace(id="blog-1", link_post="web", state=BlogState.PENDING)
    publication = publication_state(publish_linkedin=False, linkedin_content=None, linkedin_status=PublicationStatus.NOT_SELECTED.value)
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))
    monkeypatch.setattr(PublicationService, "_save", classmethod(lambda cls, value: value))
    monkeypatch.setattr(PublicationService, "_publisher", classmethod(lambda cls: pytest.fail("LinkedIn must not be constructed")))

    result = asyncio.run(PublicationService.publish("blog-1"))

    assert blog.state == BlogState.APPROVED
    assert result["publishLinkedin"] is False


# Publish LinkedIn only without exposing the Blog through the Web state.
def test_linkedin_only_keeps_blog_hidden(monkeypatch):
    blog = SimpleNamespace(id="blog-1", link_post="linkedin", state=BlogState.PENDING)
    publication = publication_state(publish_web=False)

    class Publisher:
        def __init__(self):
            self.linkedin = SimpleNamespace(validate=lambda: None, close=self.close)

        async def close(self):
            return None

        async def publish_text(self, _):
            return {"post_id": "urn:li:share:only"}

    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))
    monkeypatch.setattr(PublicationService, "_save", classmethod(lambda cls, value: value))
    monkeypatch.setattr(PublicationService, "_images", classmethod(lambda cls, _: asyncio.sleep(0, result=[])))
    monkeypatch.setattr(PublicationService, "_publisher", classmethod(lambda cls: Publisher()))

    result = asyncio.run(PublicationService.publish("blog-1"))

    assert blog.state == BlogState.PENDING
    assert result["linkedinStatus"] == PublicationStatus.PUBLISHED.value


# Stop before LinkedIn when committing the Web publication fails.
def test_web_failure_prevents_linkedin(monkeypatch):
    blog = SimpleNamespace(id="blog-1", link_post="both", state=BlogState.PENDING)
    publication = publication_state()
    called = {"publish": 0, "closed": 0}

    class Publisher:
        def __init__(self):
            self.linkedin = SimpleNamespace(validate=lambda: None, close=self.close)

        async def close(self):
            called["closed"] += 1

        async def publish_text(self, _):
            called["publish"] += 1

    # Emulate a database failure only when the Blog publication is committed.
    def save(cls, value):
        if value is blog:
            raise RuntimeError("database unavailable")
        return value

    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(PublicationService, "_publication", classmethod(lambda cls, _: publication))
    monkeypatch.setattr(PublicationService, "_save", classmethod(save))
    monkeypatch.setattr(PublicationService, "_images", classmethod(lambda cls, _: asyncio.sleep(0, result=[])))
    monkeypatch.setattr(PublicationService, "_publisher", classmethod(lambda cls: Publisher()))

    with pytest.raises(RuntimeError, match="database unavailable"):
        asyncio.run(PublicationService.publish("blog-1"))

    assert called == {"publish": 0, "closed": 1}
