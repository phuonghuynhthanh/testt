import asyncio
import json
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, inspect, text

from apps.blogs.schemas import BlogState
from apps.main import app
from apps.linkedin_posts.schemas import LinkedInPostAction, LinkedInPostStatus
from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.services.posts import LinkedInPostService
from apps.publications.migrations import apply as apply_publication_migration
from apps.publications.schemas import DraftRequest, LinkedInCommandRequest, LinkedInMode
from apps.publications.services import PublicationService


# Build a complete association state for orchestration tests.
def publication_state(**updates):
    values = {
        "id": "publication-1",
        "blog_id": "blog-1",
        "publish_web": True,
        "publish_linkedin": True,
        "linkedin_mode": "SUMMARY",
        "linkedin_content": None,
        "linkedin_include_web_link": False,
        "linkedin_link_placement": "NONE",
        "linkedin_record_id": "post-1",
        "linkedin_status": "NOT_SELECTED",
        "linkedin_post_id": None,
        "linkedin_published_at": None,
        "linkedin_error": None,
        "linkedin_media": [],
        "linkedin_fact_check": None,
        "linkedin_generation": None,
    }
    values.update(updates)
    return SimpleNamespace(**values)


# Build a complete standalone LinkedIn state for orchestration tests.
def post_state(**updates):
    values = {
        "id": "post-1",
        "content": "Reviewed content",
        "topic": None,
        "media_mode": "none",
        "media": [],
        "fact_check": None,
        "generation": None,
        "source_type": "BLOG_ADAPTATION",
        "link_placement": "NONE",
        "published_link_url": None,
        "link_comment_status": "NOT_REQUESTED",
        "provider_comment_id": None,
        "link_comment_error": None,
        "link_comment_published_at": None,
        "status": LinkedInPostStatus.READY.value,
        "provider_post_id": None,
        "published_at": None,
        "last_error": None,
        "manually_edited": False,
        "deleted_at": None,
        "created_at": None,
        "modified_at": None,
    }
    values.update(updates)
    return SimpleNamespace(**values)


# Verify the one-request Blog-derived save/publish command is registered.
def test_blog_linkedin_command_route_is_registered():
    routes = {
        (method, route.path) for route in app.routes for method in route.methods or []
    }

    assert ("POST", "/publications/blogs/{blog_id}/linkedin") in routes


# Verify Blog adaptation generation returns a preview without creating association state.
def test_blog_linkedin_draft_has_no_persistence(monkeypatch):
    blog = SimpleNamespace(
        title="Latency",
        content="Article",
        category="KNOWLEDGE_BASE",
        tag="quant",
        link_post="latency",
    )
    result = SimpleNamespace(
        content="Preview",
        media=SimpleNamespace(model_dump=lambda: {"mode": "none", "images": []}),
        factualReview=SimpleNamespace(
            model_dump=lambda: {"requiresHumanFactCheck": False, "factCheckNotes": []}
        ),
        generated=None,
    )

    # Supply a no-network generator and fail if preview code attempts persistence.
    class Generator:
        # Accept the provider used by the production constructor.
        def __init__(self, _):
            pass

        # Return a deterministic review preview.
        async def draft(self, _, language="vietnamese"):
            return result

    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(
        PublicationService, "_find_publication", classmethod(lambda cls, _: None)
    )
    monkeypatch.setattr(
        PublicationService,
        "_save",
        classmethod(lambda cls, _: pytest.fail("preview must not persist")),
    )

    # Supply an empty authoritative feed without making a provider request.
    async def recent_history(_self):
        return []

    monkeypatch.setattr(
        "apps.publications.services.LinkedInHistoryService.recent", recent_history
    )
    monkeypatch.setattr(
        "apps.publications.services.GeminiLinkedInProvider",
        lambda *_: SimpleNamespace(_owns_client=False),
    )
    monkeypatch.setattr("apps.publications.services.LinkedInDraftGenerator", Generator)

    preview = asyncio.run(
        PublicationService.draft(
            "blog-1", DraftRequest(mode=LinkedInMode.SUMMARY, includeWebLink=False)
        )
    )

    assert preview["content"] == "Preview"


# Return 503 when SUMMARY cannot load authoritative LinkedIn history.
def test_blog_summary_history_failure_is_service_unavailable(monkeypatch):
    blog = SimpleNamespace(
        title="Latency",
        content="Article",
        category="KNOWLEDGE_BASE",
        tag="quant",
        link_post="latency",
    )

    # Fail at the shared live-history boundary before Gemini generation.
    async def unavailable(_self):
        raise LinkedInError(
            "provider_history_unavailable", "History unavailable", provider_status=403
        )

    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(
        PublicationService, "_find_publication", classmethod(lambda cls, _: None)
    )
    monkeypatch.setattr(
        "apps.publications.services.LinkedInHistoryService.recent", unavailable
    )
    monkeypatch.setattr(
        "apps.publications.services.GeminiLinkedInProvider",
        lambda *_: SimpleNamespace(_owns_client=False),
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            PublicationService.draft(
                "blog-1",
                DraftRequest(mode=LinkedInMode.SUMMARY, includeWebLink=False),
            )
        )

    assert error.value.status_code == 503


# Verify SAVE_DRAFT creates the standalone record and association without publishing.
def test_blog_linkedin_save_draft_links_standalone_record(monkeypatch):
    blog = SimpleNamespace(id="blog-1")
    publication = publication_state(linkedin_record_id=None)
    post = post_state(link_placement="IN_POST")
    saved = []
    published = []
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(
        PublicationService, "_publication", classmethod(lambda cls, _: publication)
    )
    monkeypatch.setattr(
        PublicationService,
        "_save",
        classmethod(lambda cls, value: saved.append(value) or value),
    )
    monkeypatch.setattr(
        LinkedInPostService,
        "save_reviewed",
        classmethod(lambda cls, data, post_id, ready: post),
    )
    monkeypatch.setattr(
        LinkedInPostService,
        "publish",
        classmethod(lambda cls, *args, **kwargs: published.append(args)),
    )

    result = asyncio.run(
        PublicationService.save_linkedin(
            "blog-1",
            LinkedInCommandRequest(
                mode=LinkedInMode.SUMMARY,
                content="Reviewed content",
                includeWebLink=False,
                action=LinkedInPostAction.SAVE_DRAFT,
            ),
        )
    )

    assert publication.linkedin_record_id == "post-1"
    assert result["linkedinStatus"] == LinkedInPostStatus.READY.value
    assert saved == [publication]
    assert published == []


# Verify Web approval precedes LinkedIn and the canonical link never mutates reviewed content.
def test_blog_linkedin_publish_now_is_web_first(monkeypatch):
    blog = SimpleNamespace(id="blog-1", link_post="latency", state=BlogState.PENDING)
    publication = publication_state(linkedin_include_web_link=True)
    post = post_state(link_placement="IN_POST")
    events = []
    captured = {}

    # Record the provider call after the Web state commit.
    async def publish(cls, post_id, *, retry=False, link_url=None):
        events.append("linkedin")
        captured["link_url"] = link_url
        assert blog.state == BlogState.APPROVED
        return LinkedInPostService.serialize(post)

    monkeypatch.setattr("config.settings.DOMAIN_URL", "https://cms.example")
    monkeypatch.setattr(
        PublicationService,
        "_save",
        classmethod(lambda cls, value: events.append("web") or value),
    )
    monkeypatch.setattr(
        LinkedInPostService, "_validate_media", staticmethod(lambda *_: None)
    )
    monkeypatch.setattr(LinkedInPostService, "publish", classmethod(publish))

    asyncio.run(PublicationService._publish_linked(blog, publication, post))

    assert events == ["web", "linkedin"]
    assert captured["link_url"] == "https://cms.example/blog/latency"
    assert post.content == "Reviewed content"


# Verify a missing reviewed LinkedIn record blocks Web publication before side effects.
def test_missing_linked_record_blocks_combined_publish(monkeypatch):
    blog = SimpleNamespace(id="blog-1", link_post="latency", state=BlogState.PENDING)
    publication = publication_state(linkedin_record_id=None)
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(
        PublicationService, "_publication", classmethod(lambda cls, _: publication)
    )
    monkeypatch.setattr(
        PublicationService, "_linked_post", staticmethod(lambda _: None)
    )

    with pytest.raises(HTTPException) as error:
        asyncio.run(PublicationService.publish("blog-1"))

    assert error.value.status_code == 422
    assert blog.state == BlogState.PENDING


# Verify Web-only publication never enters the LinkedIn state machine.
def test_web_only_never_calls_linkedin(monkeypatch):
    blog = SimpleNamespace(id="blog-1", link_post="web", state=BlogState.PENDING)
    publication = publication_state(publish_linkedin=False, linkedin_record_id=None)
    monkeypatch.setattr(PublicationService, "_blog", classmethod(lambda cls, _: blog))
    monkeypatch.setattr(
        PublicationService, "_publication", classmethod(lambda cls, _: publication)
    )
    monkeypatch.setattr(
        PublicationService, "_linked_post", staticmethod(lambda _: None)
    )
    monkeypatch.setattr(
        PublicationService, "_save", classmethod(lambda cls, value: value)
    )
    monkeypatch.setattr(
        LinkedInPostService,
        "publish",
        classmethod(
            lambda cls, *args, **kwargs: pytest.fail("LinkedIn must not be called")
        ),
    )

    result = asyncio.run(PublicationService.publish("blog-1"))

    assert blog.state == BlogState.APPROVED
    assert result["publishLinkedin"] is False


# Verify a Web commit failure prevents the later LinkedIn provider call.
def test_web_failure_prevents_linkedin(monkeypatch):
    blog = SimpleNamespace(id="blog-1", link_post="both", state=BlogState.PENDING)
    publication = publication_state(linkedin_include_web_link=True)
    post = post_state()
    monkeypatch.setattr(
        LinkedInPostService, "_validate_media", staticmethod(lambda *_: None)
    )
    monkeypatch.setattr(
        LinkedInPostService,
        "publish",
        classmethod(
            lambda cls, *args, **kwargs: pytest.fail("LinkedIn must not be called")
        ),
    )
    monkeypatch.setattr(
        PublicationService,
        "_save",
        classmethod(
            lambda cls, _: (_ for _ in ()).throw(RuntimeError("database unavailable"))
        ),
    )

    with pytest.raises(RuntimeError, match="database unavailable"):
        asyncio.run(PublicationService._publish_linked(blog, publication, post))


# Verify legacy rows move to standalone LinkedIn storage without losing provider state.
def test_publication_migration_preserves_legacy_linkedin_data(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'cms.db'}")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE blogs (id VARCHAR PRIMARY KEY)"))
        connection.execute(
            text(
                "CREATE TABLE post_publications (id VARCHAR PRIMARY KEY, blog_id VARCHAR NOT NULL UNIQUE, publish_web BOOLEAN NOT NULL, publish_linkedin BOOLEAN NOT NULL, linkedin_mode VARCHAR NOT NULL, linkedin_content VARCHAR, linkedin_include_web_link BOOLEAN NOT NULL, linkedin_status VARCHAR NOT NULL, linkedin_post_id VARCHAR, linkedin_published_at DATETIME, linkedin_error JSON, linkedin_media JSON, linkedin_fact_check JSON, linkedin_manually_edited BOOLEAN NOT NULL, created_at DATETIME, modified_at DATETIME)"
            )
        )
        connection.execute(text("INSERT INTO blogs (id) VALUES ('legacy-blog')"))
        connection.execute(
            text(
                "INSERT INTO post_publications (id, blog_id, publish_web, publish_linkedin, linkedin_mode, linkedin_content, linkedin_include_web_link, linkedin_status, linkedin_post_id, linkedin_media, linkedin_fact_check, linkedin_manually_edited) VALUES ('publication-1', 'legacy-blog', 1, 1, 'SUMMARY', 'Legacy reviewed content', 1, 'PUBLISHED', 'urn:li:share:1', '[]', '{\"checked\": true}', 1)"
            )
        )

    apply_publication_migration(engine)
    apply_publication_migration(engine)

    assert "linkedin_record_id" in {
        column["name"] for column in inspect(engine).get_columns("post_publications")
    }
    assert any(
        foreign_key["referred_table"] == "categories"
        and foreign_key["constrained_columns"] == ["category_id"]
        for foreign_key in inspect(engine).get_foreign_keys("blogs")
    )
    with engine.connect() as connection:
        row = connection.execute(
            text(
                "SELECT p.linkedin_record_id, l.content, l.status, l.provider_post_id, l.fact_check FROM post_publications p JOIN linkedin_posts l ON l.id=p.linkedin_record_id"
            )
        ).one()
        categories = set(
            connection.execute(text("SELECT name FROM categories")).scalars().all()
        )
    assert row[0]
    assert row[1:4] == ("Legacy reviewed content", "PUBLISHED", "urn:li:share:1")
    assert json.loads(row[4]) == {"checked": True}
    assert categories == {
        "INVESTMENT_INSIGHTS",
        "FOREIGN_INVESTMENT",
        "KNOWLEDGE_BASE",
        "TUTORIALS",
        "CAREER",
        "NEWS",
    }
