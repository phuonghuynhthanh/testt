"""Check per-article language, migration safety, and backward-compatible APIs offline."""

import json
from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.auth.services import require_admin
from apps.blogs.models import Blog
from apps.blogs.routers import router
from apps.categories.models import Category
from apps.core.rate_limit import limiter
from apps.linkedin_posts.models import LinkedInPost
from apps.publications.migrations import apply
from apps.publications.models import BlogPublication
from config.database import DatabaseManager

NOW = datetime(2026, 10, 6, 12)


# Serve real Blog routes against isolated tables without provider or production access.
@pytest.fixture
def api(monkeypatch):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    for model in [Category, Blog, LinkedInPost, BlogPublication]:
        model.__table__.create(engine)
    factory = sessionmaker(bind=engine)
    monkeypatch.setattr(DatabaseManager, "engine", engine)
    monkeypatch.setattr(DatabaseManager, "session", factory())
    monkeypatch.setattr("config.settings.DOMAIN_URL", "https://example.test")
    app = FastAPI()
    app.state.limiter = limiter

    # Bypass JWT only for this isolated data-contract fixture.
    def admin():
        return "admin"

    app.dependency_overrides[require_admin] = admin
    app.include_router(router)
    with TestClient(app) as client:
        yield client, factory
    DatabaseManager.session.close()
    engine.dispose()


# Seed mixed-language rows, including records that must stay out of public feeds.
def _seed(factory):
    with factory() as session:
        session.add(Category(id="news", name="R & D", slug="r-d"))
        for index, (key, language) in enumerate(
            [("vi", "vietnamese"), ("en-1", "english"), ("en-2", "english"),
             ("pending", "english"), ("deleted", "english"), ("private", "english"),
             ("other", "english")]
        ):
            session.add(Blog(
                id=key, tag="quant", title=f"Article {key}", link_post=key,
                banner_url="", content="Reviewed content",
                seo={"title": "SEO", "description": "Description", "keywords": [],
                     "url": f"https://example.test/blog/{key}"},
                category="OTHER" if key == "other" else "R & D",
                category_id=None if key == "other" else "news", language=language,
                state="PENDING" if key == "pending" else "APPROVED",
                deleted_at=NOW if key == "deleted" else None,
                created_at=NOW - timedelta(minutes=index), modified_at=NOW,
            ))
        session.add(BlogPublication(blog_id="private", publish_web=False))
        session.commit()


# Add the default once, preserve legacy data, and support inserts from an older backend.
def test_language_migration_is_idempotent_and_preserves_legacy_data(monkeypatch):
    monkeypatch.setattr("config.settings.DOMAIN_URL", "https://example.test")
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.execute(text(
            "CREATE TABLE blogs (id VARCHAR PRIMARY KEY, title VARCHAR, tag VARCHAR, "
            "link_post VARCHAR, content VARCHAR, seo JSON, category VARCHAR, "
            "created_at TIMESTAMP, modified_at TIMESTAMP)"
        ))
        connection.execute(text(
            "INSERT INTO blogs VALUES ('legacy', 'Tiêu đề', 'quant', 'legacy', "
            "'Original content', :seo, 'NEWS', '2026-01-01', '2026-01-02')"
        ), {"seo": json.dumps({"url": "https://example.test/blog/legacy"})})
        before = connection.execute(text("SELECT * FROM blogs")).one()
    BlogPublication.__table__.create(engine)

    apply(engine)
    apply(engine)

    language = next(column for column in inspect(engine).get_columns("blogs")
                    if column["name"] == "language")
    assert language["nullable"] is False
    assert language["default"] == "'vietnamese'"
    assert "ix_blogs_language" in {index["name"] for index in inspect(engine).get_indexes("blogs")}
    with engine.begin() as connection:
        assert connection.execute(text(
            "SELECT id, title, tag, link_post, content, seo, category, created_at, modified_at "
            "FROM blogs WHERE id='legacy'"
        )).one() == before
        assert connection.execute(text("SELECT language FROM blogs WHERE id='legacy'")).scalar_one() == "vietnamese"
        connection.execute(text("INSERT INTO blogs (id) VALUES ('old-backend')"))
        assert connection.execute(text("SELECT language FROM blogs WHERE id='old-backend'")).scalar_one() == "vietnamese"
        connection.execute(text("UPDATE blogs SET language='english' WHERE id='legacy'"))
    apply(engine)
    with engine.connect() as connection:
        assert connection.execute(text("SELECT language FROM blogs WHERE id='legacy'")).scalar_one() == "english"
    engine.dispose()


# Keep omission compatible and paginate only the selected language/category result set.
def test_client_list_language_and_pagination(api):
    client, factory = api
    _seed(factory)
    all_blogs = client.get("/blog/client/blogs").json()
    assert [item["id"] for item in all_blogs["blogs"]] == ["vi", "en-1", "en-2", "other"]
    assert {item["language"] for item in all_blogs["blogs"]} == {"english", "vietnamese"}
    assert all_blogs["next_req"] is None
    vietnamese = client.get("/blog/client/blogs?language=vietnamese").json()
    assert [item["id"] for item in vietnamese["blogs"]] == ["vi"]

    first = client.get("/blog/client/blogs", params={
        "language": "english", "category": "R & D", "limit": 1
    }).json()
    assert [item["id"] for item in first["blogs"]] == ["en-1"]
    assert first["blogs"][0]["language"] == "english"
    assert parse_qs(urlsplit(first["next_req"]).query) == {
        "num_of_blogs": ["1"], "limit": ["1"], "category": ["R & D"], "language": ["english"]
    }
    second = client.get("/" + first["next_req"]).json()
    assert [item["id"] for item in second["blogs"]] == ["en-2"]
    assert second["next_req"] is None
    assert client.get("/blog/client/blogs?language=english&num_of_blogs=99").json() == {"blogs": [], "next_req": None}


# Omitted filters retain the exact default legacy load-more URL.
def test_client_next_request_without_filters(api):
    client, factory = api
    _seed(factory)
    first = client.get("/blog/client/blogs?limit=1").json()
    assert first["next_req"] == "blog/client/blogs?num_of_blogs=1&limit=1"
    with factory() as session:
        for index in range(10):
            session.add(Blog(
                tag="quant", title=f"Extra {index}", link_post=f"extra-{index}",
                banner_url="", content="Reviewed", category="R & D", state="APPROVED",
                seo={"title": "SEO", "description": "Description", "keywords": [], "url": "https://example.test"},
            ))
        session.commit()
    assert client.get("/blog/client/blogs").json()["next_req"] == "blog/client/blogs?num_of_blogs=10"


# Both recommendation modes expose language and exclude articles in another language.
@pytest.mark.parametrize("slug,expected", [("vi", set()), ("en-1", {"en-2"})])
@pytest.mark.parametrize("query", ["", "?related=category"])
def test_detail_and_related_keep_article_language(api, slug, expected, query):
    client, factory = api
    _seed(factory)
    response = client.get(f"/blog/link/{slug}{query}")
    assert response.status_code == 200
    detail = response.json()
    assert detail["language"] == ("vietnamese" if slug == "vi" else "english")
    # Legacy tag matching may include the other category; category mode must exclude it.
    if slug == "en-1" and not query:
        expected = expected | {"other"}
    assert {item["id"] for item in detail["related_blogs"]} == expected
    assert all(item["language"] == detail["language"] for item in detail["related_blogs"])
    assert client.get("/blog/admin/" + slug).json()["language"] == detail["language"]


# Count and page administrator results after applying the language filter.
def test_admin_list_language_filter_and_total(api):
    client, factory = api
    _seed(factory)
    unfiltered = client.get("/blog/admin/blogs").json()
    assert unfiltered["total"] == 6
    assert {item["language"] for item in unfiltered["items"]} == {"vietnamese", "english"}
    filtered = client.get("/blog/admin/blogs", params={
        "language": "english", "category": "R & D", "state": "APPROVED", "pageSize": 1, "page": 2,
    }).json()
    assert filtered["total"] == 3
    assert filtered["totalPages"] == 3
    assert len(filtered["items"]) == 1
    assert filtered["items"][0]["language"] == "english"


# Persist the create default, explicit choices, and partial updates without resetting language.
def test_create_and_update_language(api):
    client, factory = api
    payload = {
        "tag": "quant", "title": "Reviewed article", "content": "Reviewed content", "category": "NEWS",
        "seo": {"title": "SEO", "description": "Description", "keywords": []},
    }
    default = client.post("/blog", data={"blog_data": json.dumps(payload)})
    assert default.status_code == 201
    assert default.json()["language"] == "vietnamese"
    english = client.post("/blog", data={"blog_data": json.dumps(payload | {"language": "english"})})
    assert english.status_code == 201
    english_id = english.json()["id"]
    assert english.json()["language"] == "english"
    for update in [{"content": "Edited"}, {"language": None}]:
        response = client.put(f"/blog/{english_id}", data={"blog_data": json.dumps(update)})
        assert response.status_code == 200
        assert response.json()["language"] == "english"
    updated = client.put(f"/blog/{default.json()['id']}", data={"blog_data": '{"language":"english"}'})
    assert updated.status_code == 200
    assert updated.json()["language"] == "english"
    with factory() as session:
        assert session.get(Blog, english_id).language == "english"
        assert session.get(Blog, default.json()["id"]).language == "english"


# Reject unsupported query languages before any database work.
@pytest.mark.parametrize("path", ["/blog/client/blogs", "/blog/admin/blogs"])
@pytest.mark.parametrize("language", ["french", "en", "", "English"])
def test_invalid_query_language_is_422(api, path, language):
    assert api[0].get(path, params={"language": language}).status_code == 422


# Apply the same language validation to multipart create and update bodies.
@pytest.mark.parametrize("language", ["french", "en", ""])
def test_invalid_write_language_is_422(api, language):
    client, _factory = api
    payload = {
        "tag": "quant", "title": "Article", "content": "Reviewed", "category": "NEWS", "language": language,
        "seo": {"title": "SEO", "description": "Description", "keywords": []},
    }
    assert client.post("/blog", data={"blog_data": json.dumps(payload)}).status_code == 422
    assert client.put("/blog/missing", data={"blog_data": json.dumps({"language": language})}).status_code == 422


# Publish optional enums and defaults in the generated OpenAPI contract.
def test_openapi_declares_language(api):
    spec = api[0].get("/openapi.json").json()
    for path in ["/blog/client/blogs", "/blog/admin/blogs"]:
        parameter = next(item for item in spec["paths"][path]["get"]["parameters"] if item["name"] == "language")
        assert parameter["required"] is False
        assert parameter["schema"]["anyOf"][0]["enum"] == ["vietnamese", "english"]
    assert spec["components"]["schemas"]["BlogSchema"]["properties"]["language"]["default"] == "vietnamese"
