from contextlib import contextmanager
from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from apps.blogs.models import Blog
from apps.blogs.services.blog import BlogServices
from apps.categories.models import Category
from apps.categories.routers import CategoryInput, update_category
from config.database import DatabaseManager


# Reuse the category inserted by a concurrent winner after the unique constraint fires.
def test_resolve_category_recovers_from_concurrent_insert(monkeypatch):
    winner = SimpleNamespace(id="category-1", name="Old", slug="data", deleted_at=None)

    class Query:
        # Report no row before insert and the winner after rollback.
        def filter(self, *_conditions):
            return self

        # Simulate the initial lookup missing the concurrent row.
        def first(self):
            return None

        # Return the row committed by the concurrent winner.
        def one(self):
            return winner

    class Session:
        # Track retry behavior across the failed and successful commits.
        def __init__(self):
            self.commits = 0
            self.rolled_back = False

        # Supply the minimal query surface used by the resolver.
        def query(self, _model):
            return Query()

        # Accept the losing insert without a real database.
        def add(self, _category):
            return None

        # Raise the unique conflict once, then accept the recovery commit.
        def commit(self):
            self.commits += 1
            if self.commits == 1:
                raise IntegrityError("insert", {}, Exception("duplicate"))

        # Record transaction recovery after the unique conflict.
        def rollback(self):
            self.rolled_back = True

        # Match the production session interface after commit.
        def refresh(self, _category):
            return None

    session = Session()

    # Replace the database boundary with a deterministic concurrent-loser session.
    @contextmanager
    def fake_session():
        yield session

    monkeypatch.setattr(BlogServices, "get_db_session", staticmethod(fake_session))

    category = BlogServices.resolve_category("Data")

    assert category is winner
    assert (category.name, category.deleted_at) == ("Data", None)
    assert session.rolled_back is True
    assert session.commits == 2


# Rename category slug and every denormalized Blog label in the same transaction.
def test_category_rename_keeps_blog_label_and_slug_aligned(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Category.__table__.create(engine)
    Blog.__table__.create(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    category = Category(id="category-1", name="Old Name", slug="old-name")
    blog = Blog(
        id="blog-1",
        tag="quant",
        title="Latency",
        banner_url="",
        link_post="latency",
        content="Content",
        seo={},
        category="Old Name",
        category_id=category.id,
        state="PENDING",
    )
    session.add_all([category, blog])
    session.commit()
    category_id, blog_id = category.id, blog.id
    monkeypatch.setattr(DatabaseManager, "session", session)

    update_category(category_id, CategoryInput(name="New Name"), "admin")

    verification = Session()
    stored_category = verification.get(Category, category_id)
    stored_blog = verification.get(Blog, blog_id)
    assert (stored_category.name, stored_category.slug) == ("New Name", "new-name")
    assert stored_blog.category == "New Name"
