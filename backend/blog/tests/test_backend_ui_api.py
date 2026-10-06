"""Exercise additive CMS APIs against SQLite without external services."""

import csv
import io
from datetime import datetime, timedelta

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from apps.auth.services import require_admin
from apps.blogs.models import Blog
from apps.blogs.routers import router as blog_router
from apps.blogs.schemas import BulkStateRequest
from apps.blogs.services.blog import BlogServices
from apps.categories.models import Category
from apps.categories.routers import router as category_router
from apps.core.date_time import DateTime
from apps.core.rate_limit import limiter
from apps.linkedin_posts.models import LinkedInPost
from apps.linkedin_posts.routers import router as linkedin_router
from apps.media.routers import router as media_router
from apps.publications.models import BlogPublication
from apps.publications.migrations import apply
from config.database import DatabaseManager

NOW = datetime(2026, 10, 5, 12, 0, 0)


# Reject unauthenticated access to every new administrator-only endpoint.
@pytest.mark.parametrize("method,path,payload", [
    ("GET", "/blog/admin/counts", None),
    ("GET", "/blog/admin/stats", None),
    ("GET", "/blog/admin/export.csv", None),
    ("POST", "/blog/admin/bulk-state", {"items": [{"id": "a", "state": "APPROVED"}]}),
    ("POST", "/blog/admin/bulk-delete", {"ids": ["a"]}),
    ("POST", "/blog/admin/bulk-restore", {"ids": ["a"]}),
    ("PATCH", "/blog/a/state", {"state": "APPROVED"}),
    ("POST", "/media/pexels/search", ["quant"]),
])
def test_new_endpoints_require_auth(api, method, path, payload):
    client, _factory = api
    client.app.dependency_overrides.clear()
    assert client.request(method, path, json=payload).status_code == 401


# Route banner searches through the existing provider-safe Pexels service.
def test_pexels_banner_search_alias(api, monkeypatch):
    calls = []

    # Capture provider keywords without network access or credentials.
    async def search(self, keywords):
        calls.append(keywords)
        return []

    monkeypatch.setattr("apps.linkedin_posts.services.pexels.PexelsService.search", search)
    response = api[0].post("/media/pexels/search", json=["quant", "research"])
    assert response.status_code == 200
    assert response.json() == {"items": []}
    assert calls == [["quant", "research"]]


# Build isolated tables and protected routes with a fixed Vietnam clock.
@pytest.fixture
def api(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    for model in [Category, Blog, LinkedInPost, BlogPublication]:
        model.__table__.create(engine)
    factory = sessionmaker(bind=engine)
    monkeypatch.setattr(DatabaseManager, "engine", engine)
    monkeypatch.setattr(DatabaseManager, "session", factory())
    monkeypatch.setattr(DateTime, "now", classmethod(lambda cls: NOW))
    monkeypatch.setattr("config.settings.DOMAIN_URL", "https://example.test")
    app = FastAPI()
    app.state.limiter = limiter

    # Supply an authenticated administrator without exercising JWT in each data test.
    def admin():
        return "admin"

    app.dependency_overrides[require_admin] = admin
    for router in [
        blog_router,
        category_router,
        linkedin_router,
        media_router,
    ]:
        app.include_router(router)
    with TestClient(app) as client:
        yield client, factory
    DatabaseManager.session.close()
    engine.dispose()


# Create complete Blogs while permitting explicit boundary and lifecycle overrides.
def blog(key, **updates):
    values = dict(
        id=key,
        title=f"Title {key}",
        link_post=f"slug-{key}",
        tag="quant",
        content="Body",
        banner_url="",
        seo={
            "title": "Title",
            "description": "SEO",
            "url": "https://example.test",
            "keywords": [],
        },
        category="NEWS",
        category_id="news",
        state="PENDING",
        created_at=NOW,
        modified_at=NOW,
    )
    return Blog(**(values | updates))


# Insert fixtures in a separate session to model real committed data.
def seed(factory, *rows):
    with factory() as session:
        session.add_all(rows)
        session.commit()


# Seed named categories shared by filter and related-article checks.
def categories(factory):
    seed(
        factory,
        Category(id="news", name="NEWS", slug="news", modified_at=NOW),
        Category(
            id="career",
            name="CAREER",
            slug="career",
            modified_at=NOW - timedelta(days=1),
        ),
    )


# Validate every ordering column and direction with deterministic ID tie-breaking.
@pytest.mark.parametrize("sort", ["title", "category", "state", "modified"])
@pytest.mark.parametrize("direction", ["asc", "desc"])
def test_admin_sort(api, sort, direction):
    client, factory = api
    categories(factory)
    seed(
        factory,
        blog("a", title="Zulu", state="REJECTED"),
        blog(
            "b",
            title="Alpha",
            category="CAREER",
            category_id="career",
            state="APPROVED",
            modified_at=NOW - timedelta(days=1),
        ),
        blog("c", title="Zulu", state="REJECTED"),
    )
    column = "modified_at" if sort == "modified" else sort
    expected = sorted(
        [
            {
                "id": "a",
                "title": "Zulu",
                "category": "NEWS",
                "state": "REJECTED",
                "modified_at": NOW,
            },
            {
                "id": "b",
                "title": "Alpha",
                "category": "CAREER",
                "state": "APPROVED",
                "modified_at": NOW - timedelta(days=1),
            },
            {
                "id": "c",
                "title": "Zulu",
                "category": "NEWS",
                "state": "REJECTED",
                "modified_at": NOW,
            },
        ],
        key=lambda item: (item[column], item["id"]),
        reverse=direction == "desc",
    )
    response = client.get(
        "/blog/admin/blogs",
        params={"sort": sort, "dir": direction, "pageSize": 1, "page": 2},
    )
    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == expected[1]["id"]
    assert response.json()["total"] == 3
    assert "linkedinPost" not in response.json()["items"][0]


# Find accents and tags additively while keeping literal wildcard characters literal.
def test_normalized_search_and_update(api):
    client, factory = api
    categories(factory)
    seed(
        factory,
        blog("a", title="Báo cáo đầu tư", tag="Định lượng"),
        blog("b", title="100% tăng trưởng"),
        blog("c", title="Hidden", deleted_at=NOW),
    )
    for query in ["bao cao", "BÁO CÁO", "dinh luong", "slug-a"]:
        assert [
            item["id"]
            for item in client.get(
                "/blog/admin/blogs", params={"search": query}
            ).json()["items"]
        ] == ["a"]
    assert [
        item["id"]
        for item in client.get(
            "/blog/admin/blogs", params={"search": "%"}
        ).json()["items"]
    ] == ["b"]
    response = client.put(
        "/blog/a",
        data={"blog_data": '{"title":"Chiến lược mới","tag":"Nghề nghiệp"}'},
    )
    assert response.status_code == 200
    assert (
        client.get(
            "/blog/admin/blogs", params={"search": "chien luoc"}
        ).json()["total"]
        == 1
    )
    assert (
        client.get("/blog/admin/blogs", params={"search": "bao cao"}).json()[
            "total"
        ]
        == 0
    )


# Join LinkedIn state and map Blog references with one batch association query.
def test_linkedin_associations(api):
    client, factory = api
    categories(factory)
    seed(
        factory,
        blog("a"),
        blog("b"),
        blog("c"),
        blog("deleted", deleted_at=NOW),
    )
    seed(
        factory,
        LinkedInPost(
            id="post",
            content="Draft",
            media_mode="none",
            source_type="BLOG_ADAPTATION",
            status="READY",
        ),
        LinkedInPost(
            id="removed",
            content="Removed",
            media_mode="none",
            source_type="BLOG_ADAPTATION",
            status="DRAFT",
            deleted_at=NOW,
        ),
        LinkedInPost(
            id="custom",
            content="Custom",
            media_mode="none",
            source_type="CUSTOM",
            status="DRAFT",
        ),
        LinkedInPost(
            id="orphan",
            content="Adaptation",
            media_mode="none",
            source_type="BLOG_ADAPTATION",
            status="DRAFT",
        ),
    )
    seed(
        factory,
        BlogPublication(blog_id="a", linkedin_record_id="post"),
        BlogPublication(blog_id="b", linkedin_record_id="removed"),
        BlogPublication(blog_id="deleted", linkedin_record_id="orphan"),
    )
    items = {
        item["id"]: item
        for item in client.get("/blog/admin/blogs?include=linkedin").json()[
            "items"
        ]
    }
    assert items["a"]["linkedinPost"] == {"id": "post", "status": "READY"}
    assert items["b"]["linkedinPost"] is items["c"]["linkedinPost"] is None
    posts = {
        item["id"]: item
        for item in client.get("/linkedin/posts").json()["items"]
    }
    assert (posts["post"]["blogId"], posts["post"]["blogTitle"]) == (
        "a",
        "Title a",
    )
    assert posts["custom"]["blogId"] is posts["orphan"]["blogId"] is None
    assert "removed" not in posts
    assert client.get("/linkedin/posts/post").json()["blogId"] == "a"


# Keep state counts independent of the tab while honoring category and normalized search.
def test_counts(api):
    client, factory = api
    categories(factory)
    seed(
        factory,
        blog("a", title="Báo cáo"),
        blog("b", title="Báo cáo", state="APPROVED"),
        blog(
            "c",
            title="Báo cáo",
            state="REJECTED",
            category="CAREER",
            category_id="career",
        ),
        blog("d", title="Other"),
        blog("e", title="Báo cáo", deleted_at=NOW),
    )
    assert client.get(
        "/blog/admin/counts?category=NEWS&search=bao%20cao&state=APPROVED"
    ).json() == {"ALL": 2, "PENDING": 1, "APPROVED": 1, "REJECTED": 0}


# Exercise midnight, seven-day, and fourteen-day boundaries plus empty dates.
def test_stats_calendar_boundaries(api):
    client, factory = api
    categories(factory)
    midnight = NOW.replace(hour=0)
    seed(
        factory,
        blog("today", created_at=midnight),
        blog(
            "last7", created_at=midnight - timedelta(days=6), state="APPROVED"
        ),
        blog("prev7", created_at=midnight - timedelta(days=7)),
        blog("first", created_at=midnight - timedelta(days=13)),
        blog("old", created_at=midnight - timedelta(days=13, microseconds=1)),
        blog("future", created_at=midnight + timedelta(days=1)),
        blog("gone", deleted_at=NOW),
    )
    result = client.get("/blog/admin/stats").json()
    assert result["ALL"] == {
        "count": 6,
        "last7": 2,
        "prev7": 2,
        "daily14": [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
    }
    assert result["APPROVED"]["last7"] == 1
    assert result["REJECTED"]["daily14"] == [0] * 14


# Round-trip moderation and deletion undo without drifting historical timestamps.
def test_bulk_actions_and_patch_undo(api):
    client, factory = api
    categories(factory)
    original = NOW - timedelta(days=10, microseconds=123456)
    seed(factory, blog("a", modified_at=original), blog("b", deleted_at=NOW))
    response = client.post(
        "/blog/admin/bulk-state",
        json={
            "items": [
                {"id": "a", "state": "APPROVED"},
                {"id": "b", "state": "APPROVED"},
                {"id": "missing", "state": "REJECTED"},
            ]
        },
    ).json()
    assert response == {
        "updated": 1,
        "items": [
            {"id": "a", "state": "APPROVED", "modified_at": NOW.isoformat()}
        ],
        "notFound": ["b", "missing"],
    }
    for _ in range(2):
        undone = client.patch(
            "/blog/a/state",
            json={"state": "PENDING", "modifiedAt": original.isoformat()},
        )
        assert undone.status_code == 200
        assert undone.json()["modified_at"] == original.isoformat()
    assert client.post(
        "/blog/admin/bulk-delete", json={"ids": ["a", "missing"]}
    ).json() == {"deleted": 1, "notFound": ["missing"]}
    assert client.get("/blog/admin/blogs").json()["total"] == 0
    assert client.post(
        "/blog/admin/bulk-restore", json={"ids": ["a", "missing"]}
    ).json() == {"restored": 1, "notFound": ["missing"]}
    assert (
        client.get("/blog/admin/a").json()["modified_at"]
        == original.isoformat()
    )
    assert (
        client.patch("/blog/b/state", json={"state": "APPROVED"}).status_code
        == 404
    )


# Normalize a UTC undo timestamp into the Blog database's Vietnam wall time.
def test_undo_timestamp_with_offset(api):
    client, factory = api
    categories(factory)
    seed(factory, blog("a"))
    response = client.patch("/blog/a/state", json={"state": "REJECTED", "modifiedAt": "2026-10-01T05:30:00.123456Z"})
    assert response.status_code == 200
    assert response.json()["modified_at"] == "2026-10-01T12:30:00.123456"
    assert client.get("/blog/admin/a").json()["modified_at"] == "2026-10-01T12:30:00.123456"


# Reject oversized, duplicate, and invalid moderation input before any database write.
@pytest.mark.parametrize(
    "path,payload",
    [
        (
            "bulk-state",
            {
                "items": [
                    {"id": str(i), "state": "PENDING"} for i in range(101)
                ]
            },
        ),
        ("bulk-delete", {"ids": [str(i) for i in range(101)]}),
        ("bulk-restore", {"ids": []}),
        ("bulk-delete", {"ids": ["a", "a"]}),
        ("bulk-state", {"items": [{"id": "a", "state": "INVALID"}]}),
    ],
)
def test_bulk_validation(api, path, payload):
    assert api[0].post(f"/blog/admin/{path}", json=payload).status_code == 422


# Roll back the entire moderation batch if the second database write fails.
def test_bulk_transaction_rollback(api):
    _client, factory = api
    categories(factory)
    seed(factory, blog("a"), blog("b"))
    updates = []

    # Fail the second update after the first has reached the transaction.
    def fail_second(
        connection, cursor, statement, parameters, context, executemany
    ):
        if statement.startswith("UPDATE blogs"):
            updates.append(statement)
            if len(updates) == 2:
                raise RuntimeError("simulated write failure")

    engine = DatabaseManager.engine
    event.listen(engine, "before_cursor_execute", fail_second)
    try:
        with pytest.raises(RuntimeError):
            BlogServices.bulk_state(
                BulkStateRequest(
                    items=[
                        {"id": "a", "state": "APPROVED"},
                        {"id": "b", "state": "REJECTED"},
                    ]
                )
            )
    finally:
        event.remove(engine, "before_cursor_execute", fail_second)
    with factory() as session:
        assert (
            session.get(Blog, "a").state
            == session.get(Blog, "b").state
            == "PENDING"
        )


# Add category counts and explicit sorting while preserving get-or-create behavior.
def test_category_counts_sort_and_strict(api):
    client, factory = api
    categories(factory)
    seed(factory, blog("a"), blog("gone", deleted_at=NOW))
    result = client.get("/categories?sort=modified&dir=desc").json()["items"]
    assert [(item["id"], item["usageCount"]) for item in result] == [
        ("news", 1),
        ("career", 0),
    ]
    assert (
        client.post(
            "/categories?strict=true", json={"name": "news"}
        ).status_code
        == 409
    )
    assert (
        client.post("/categories", json={"name": "NEWS"}).json()["id"]
        == "news"
    )
    client.delete("/categories/news")
    assert (
        client.post("/categories?strict=true", json={"name": "NEWS"}).json()[
            "id"
        ]
        == "news"
    )


# Bound public pages and preserve the category and customized limit in next_req.
def test_public_limit_and_category_related(api):
    client, factory = api
    categories(factory)
    seed(
        factory,
        *[
            blog(
                str(index),
                state="APPROVED",
                created_at=NOW - timedelta(days=index),
                modified_at=NOW - timedelta(days=index),
            )
            for index in range(12)
        ],
        blog(
            "career", state="APPROVED", category_id="career", category="CAREER"
        ),
        blog("deleted", state="APPROVED", deleted_at=NOW),
        blog("private", state="APPROVED"),
    )
    seed(factory, BlogPublication(blog_id="private", publish_web=False))
    feed = client.get("/blog/client/blogs?category=NEWS&limit=6").json()
    assert len(feed["blogs"]) == 6
    assert feed["next_req"] == "blog/client/blogs?num_of_blogs=6&limit=6&category=NEWS"
    assert (
        client.get("/blog/client/blogs?category=NEWS").json()["next_req"]
        == "blog/client/blogs?num_of_blogs=10&category=NEWS"
    )
    assert client.get("/blog/client/blogs?limit=25").status_code == 422
    related = client.get("/blog/link/slug-0?related=category&limit=3").json()[
        "related_blogs"
    ]
    assert [item["id"] for item in related] == ["1", "2", "3"]
    assert (
        client.get("/blog/link/slug-private?related=category").status_code
        == 404
    )


# Export the same filtered order with an Excel BOM and harmless formula text.
def test_csv_export(api):
    client, factory = api
    categories(factory)
    seed(
        factory,
        blog("a", title="=danger"),
        blog("b", title="Báo cáo"),
        blog("c", state="REJECTED"),
    )
    response = client.get(
        "/blog/admin/export.csv?state=PENDING&sort=title&dir=asc"
    )
    assert response.status_code == 200
    assert response.content.startswith(b"\xef\xbb\xbf")
    assert response.headers["x-truncated"] == "false"
    rows = list(csv.reader(io.StringIO(response.content.decode("utf-8-sig"))))
    assert rows[0] == ["Tiêu đề", "Slug", "Danh mục", "Trạng thái", "Cập nhật"]
    assert [row[0] for row in rows[1:]] == ["'=danger", "Báo cáo"]


# Upgrade a legacy search column twice and preserve original Blog timestamps.
def test_search_migration_idempotent(api):
    _client, factory = api
    categories(factory)
    seed(factory, blog("a", title="Báo cáo Đầu tư"))
    engine = DatabaseManager.engine
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE blogs DROP COLUMN search_text"))
    apply(engine)
    apply(engine)
    with factory() as session:
        stored = session.get(Blog, "a")
        assert stored.search_text == "bao cao dau tu slug-a quant"
        assert stored.modified_at == NOW
