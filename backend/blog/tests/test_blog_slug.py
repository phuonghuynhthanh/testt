from types import SimpleNamespace

import pytest
from sqlalchemy.exc import IntegrityError

from apps.blogs.schemas import BlogCreate
from apps.blogs.services.blog import BlogServices


# Verify Vietnamese characters are transliterated instead of deleted.
def test_create_url_preserves_vietnamese_words():
    title = "Xu hướng đầu tư dài hạn tại Việt Nam"

    assert BlogServices._create_url(title) == (
        "xu-huong-dau-tu-dai-han-tai-viet-nam"
    )


# Reserve deleted and active suffixes while filling the first numeric gap.
def test_next_slug_uses_all_matching_rows_and_first_gap():
    class Session:
        # Return values without applying an active-row filter.
        def scalars(self, _query):
            return ["chien-luoc", "chien-luoc-2", "chien-luoc-4"]

    assert BlogServices._next_slug(Session(), "Chiến lược") == "chien-luoc-3"


# Ignore only retired authoritative fields while rejecting unrelated input.
def test_blog_create_legacy_slug_and_seo_url_compatibility():
    payload = {
        "tag": "quant",
        "title": "Latency",
        "banner_url": "",
        "link_post": "client-owned",
        "content": "Reviewed",
        "category": "NEWS",
        "seo": {
            "title": "Latency",
            "description": "Description",
            "url": "https://wrong.example/blog/client-owned",
            "keywords": [],
        },
    }

    parsed = BlogCreate.model_validate(payload)

    assert "link_post" not in parsed.model_dump()
    assert "url" not in parsed.seo.model_dump()
    with pytest.raises(ValueError):
        BlogCreate.model_validate({**payload, "unknown": True})


# Recompute the slug after a concurrent unique-constraint winner.
def test_blog_create_retries_confirmed_slug_collision(monkeypatch):
    sessions = []

    class Session:
        # Track allocation and write sessions in construction order.
        def __init__(self, *_args, **_kwargs):
            self.index = len(sessions)
            sessions.append(self)
            self.blog = None

        # Enter one fresh transaction scope.
        def __enter__(self):
            return self

        # Preserve service exception handling.
        def __exit__(self, *_args):
            return False

        # Expose the concurrent winner only to the second write attempt.
        def scalars(self, _query):
            return ["latency"] if self.index == 2 else []

        # Capture the attempted Blog row.
        def add(self, blog):
            self.blog = blog

        # Fail only the first insert attempt.
        def commit(self):
            if self.index == 1:
                raise IntegrityError("insert", {}, RuntimeError("unique link_post"))

        # Permit the collision rollback path.
        def rollback(self):
            pass

        # Confirm that the failed constraint belongs to link_post.
        def scalar(self, _query):
            return "winner" if self.index == 1 else None

        # Accept successful ORM refresh and detach operations.
        def refresh(self, _blog):
            pass

        # Detach the committed Blog before the session closes.
        def expunge(self, _blog):
            pass

    data = BlogCreate(
        tag="quant",
        title="Latency",
        content="Reviewed",
        category="NEWS",
        seo={"title": "Latency", "description": "Description", "keywords": []},
    )
    monkeypatch.setattr("apps.blogs.services.blog.Session", Session)
    monkeypatch.setattr(
        BlogServices,
        "resolve_category",
        classmethod(lambda cls, name: SimpleNamespace(name=name, id="category-1")),
    )
    monkeypatch.setattr("config.settings.DOMAIN_URL", "https://quant.vn")

    blog = BlogServices.create_blog(data)

    assert blog.link_post == "latency-2"
    assert blog.seo["url"] == "https://quant.vn/blog/latency-2"
