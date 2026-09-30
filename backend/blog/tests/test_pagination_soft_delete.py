from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from apps.blogs.models import Blog
from apps.blogs.routers import restore_blog
from apps.blogs.services.blog import BlogServices
from apps.categories.models import Category
from apps.core.storage import StorageService
from apps.linkedin_posts.models import LinkedInPost
from apps.linkedin_posts.services.posts import LinkedInPostService
from config.database import DatabaseManager


# Create isolated Blog and LinkedIn tables for pagination and lifecycle checks.
def _database(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Category.__table__.create(engine)
    Blog.__table__.create(engine)
    LinkedInPost.__table__.create(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    monkeypatch.setattr(DatabaseManager, "engine", engine)
    monkeypatch.setattr(DatabaseManager, "session", session)
    return Session, session


# Build a complete local LinkedIn row without contacting its provider.
def _linkedin(post_id: str, status: str = "DRAFT") -> LinkedInPost:
    return LinkedInPost(
        id=post_id,
        content=f"Post {post_id}",
        media_mode="none",
        media=[],
        source_type="CUSTOM",
        status=status,
        manually_edited=True,
        modified_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )


# Build a complete Blog row with stable timestamps for deterministic page assertions.
def _blog(blog_id: str, state: str = "PENDING", category: str = "NEWS") -> Blog:
    return Blog(
        id=blog_id,
        tag="quant",
        title=f"Blog {blog_id}",
        banner_url="",
        link_post=f"blog-{blog_id}",
        content="Content",
        seo={},
        category=category,
        state=state,
        modified_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )


# Use COUNT/LIMIT/OFFSET with stable ordering and filters for LinkedIn records.
def test_linkedin_list_paginates_and_filters(monkeypatch):
    _Session, session = _database(monkeypatch)
    session.add_all(
        [
            _linkedin("1"),
            _linkedin("2", "PUBLISHED"),
            _linkedin("3", "PUBLISHED"),
            _linkedin("4", "PUBLISHED"),
            _linkedin("5"),
        ]
    )
    session.commit()

    result = LinkedInPostService.list(
        page=2, page_size=1, status="PUBLISHED"
    )

    assert [item["id"] for item in result["items"]] == ["3"]
    assert result | {"items": []} == {
        "items": [],
        "page": 2,
        "pageSize": 1,
        "total": 3,
        "totalPages": 3,
    }


# Use bounded database pagination and category/state filters for the Blog admin list.
def test_blog_admin_list_paginates_and_filters(monkeypatch):
    _Session, session = _database(monkeypatch)
    session.add_all(
        [
            _blog("1"),
            _blog("2", state="APPROVED"),
            _blog("3", state="APPROVED"),
            _blog("4", state="APPROVED", category="CAREER"),
        ]
    )
    session.commit()

    result = BlogServices.get_blogs_for_admin(
        state="APPROVED", category="NEWS", page=2, page_size=1
    )

    assert [item["id"] for item in result["items"]] == ["2"]
    assert result | {"items": []} == {
        "items": [],
        "page": 2,
        "pageSize": 1,
        "total": 2,
        "totalPages": 2,
    }


# Keep soft-deleted Blog and LinkedIn rows recoverable without touching external media.
def test_soft_delete_and_restore_preserve_rows_and_storage(monkeypatch):
    Session, session = _database(monkeypatch)
    category = Category(id="category-1", name="NEWS", slug="news")
    blog = Blog(
        id="blog-1",
        tag="quant",
        title="Latency",
        banner_url="banner.png",
        link_post="latency",
        content="Content",
        seo={},
        category="NEWS",
        category_id=category.id,
        state="PENDING",
    )
    post = _linkedin("post-1", "PUBLISHED")
    session.add_all([category, blog, post])
    session.commit()
    blog_id, post_id = blog.id, post.id
    monkeypatch.setattr(
        StorageService,
        "delete_image",
        lambda *_: (_ for _ in ()).throw(AssertionError("storage must remain")),
    )
    monkeypatch.setattr(
        StorageService,
        "delete_key",
        lambda *_: (_ for _ in ()).throw(AssertionError("storage must remain")),
    )

    BlogServices.delete_blog(blog_id)
    LinkedInPostService.delete(post_id)

    verification = Session()
    assert verification.get(Blog, blog_id).deleted_at is not None
    assert verification.get(LinkedInPost, post_id).deleted_at is not None

    # Rebind the shared session after the delete helpers close it.
    monkeypatch.setattr(DatabaseManager, "session", Session())
    restore_blog(blog_id, "admin")
    LinkedInPostService.restore(post_id)

    restored = Session()
    assert restored.get(Blog, blog_id).deleted_at is None
    assert restored.get(LinkedInPost, post_id).deleted_at is None
