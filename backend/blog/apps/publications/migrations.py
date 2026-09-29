"""Small explicit migration for the publication table and legacy Blog backfill."""

from uuid import uuid4

from sqlalchemy import MetaData, Table, inspect, select, text

from apps.core.date_time import DateTime


# Upgrade an earlier local publication table and create Web-only rows for legacy Blogs.
def apply(engine) -> None:
    inspector = inspect(engine)
    if "post_publications" not in inspector.get_table_names() or "blogs" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("post_publications")}
    if "linkedin_generation" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE post_publications ADD COLUMN linkedin_generation JSON"))

    metadata = MetaData()
    blogs = Table("blogs", metadata, autoload_with=engine)
    publications = Table("post_publications", metadata, autoload_with=engine)
    with engine.begin() as connection:
        missing_ids = connection.execute(select(blogs.c.id).outerjoin(publications, publications.c.blog_id == blogs.c.id).where(publications.c.id.is_(None))).scalars().all()
        now = DateTime.now()
        if missing_ids:
            connection.execute(publications.insert(), [{"id": str(uuid4()), "blog_id": blog_id, "publish_web": True, "publish_linkedin": False, "linkedin_mode": "SAME", "linkedin_include_web_link": False, "linkedin_status": "NOT_SELECTED", "linkedin_manually_edited": False, "created_at": now, "modified_at": now} for blog_id in missing_ids])
