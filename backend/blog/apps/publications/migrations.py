"""Small explicit migration for the publication table and legacy Blog backfill."""

from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime as SQLDateTime,
    JSON,
    MetaData,
    String,
    Table,
    inspect,
    select,
    text,
)

from apps.core.date_time import DateTime


# Upgrade an earlier local publication table and create Web-only rows for legacy Blogs.
def apply(engine) -> None:
    inspector = inspect(engine)
    if (
        "post_publications" not in inspector.get_table_names()
        or "blogs" not in inspector.get_table_names()
    ):
        return
    columns = {column["name"] for column in inspector.get_columns("post_publications")}
    if "linkedin_generation" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE post_publications ADD COLUMN linkedin_generation JSON"
                )
            )
    if "linkedin_record_id" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE post_publications ADD COLUMN linkedin_record_id VARCHAR"
                )
            )

    # Create the independent table for upgrades that predate its SQLAlchemy model import.
    metadata = MetaData()
    linkedin_posts = Table(
        "linkedin_posts",
        metadata,
        Column("id", String, primary_key=True),
        Column("content", String, nullable=False),
        Column("media_mode", String, nullable=False),
        Column("media", JSON),
        Column("fact_check", JSON),
        Column("generation", JSON),
        Column("source_type", String, nullable=False),
        Column("status", String, nullable=False),
        Column("provider_post_id", String),
        Column("published_at", SQLDateTime),
        Column("last_error", JSON),
        Column("manually_edited", Boolean, nullable=False, default=False),
        Column("created_at", SQLDateTime),
        Column("modified_at", SQLDateTime),
    )
    metadata.create_all(engine, tables=[linkedin_posts])

    metadata = MetaData()
    blogs = Table("blogs", metadata, autoload_with=engine)
    publications = Table("post_publications", metadata, autoload_with=engine)
    with engine.begin() as connection:
        missing_ids = (
            connection.execute(
                select(blogs.c.id)
                .outerjoin(publications, publications.c.blog_id == blogs.c.id)
                .where(publications.c.id.is_(None))
            )
            .scalars()
            .all()
        )
        now = DateTime.now()
        if missing_ids:
            connection.execute(
                publications.insert(),
                [
                    {
                        "id": str(uuid4()),
                        "blog_id": blog_id,
                        "publish_web": True,
                        "publish_linkedin": False,
                        "linkedin_mode": "SAME",
                        "linkedin_include_web_link": False,
                        "linkedin_status": "NOT_SELECTED",
                        "linkedin_manually_edited": False,
                        "created_at": now,
                        "modified_at": now,
                    }
                    for blog_id in missing_ids
                ],
            )
        # Copy legacy LinkedIn records once; leave old columns until a later verified cleanup.
        legacy_rows = (
            connection.execute(
                select(publications).where(
                    publications.c.linkedin_record_id.is_(None),
                    publications.c.linkedin_content.is_not(None),
                )
            )
            .mappings()
            .all()
        )
        for row in legacy_rows:
            media = row.get("linkedin_media") or []
            mode = (
                media.get("mode", "none")
                if isinstance(media, dict)
                else (
                    "none"
                    if not media
                    else "single-image" if len(media) == 1 else "multi-image"
                )
            )
            record_id = str(uuid4())
            connection.execute(
                linkedin_posts.insert().values(
                    id=record_id,
                    content=row["linkedin_content"],
                    media_mode=mode,
                    media=media.get("items", []) if isinstance(media, dict) else media,
                    fact_check=row.get("linkedin_fact_check"),
                    generation=row.get("linkedin_generation"),
                    source_type="BLOG_ADAPTATION",
                    status=(
                        row.get("linkedin_status")
                        if row.get("linkedin_status")
                        in {
                            "DRAFT",
                            "READY",
                            "PUBLISHING",
                            "PUBLISHED",
                            "FAILED",
                            "REVIEW_REQUIRED",
                        }
                        else "DRAFT"
                    ),
                    provider_post_id=row.get("linkedin_post_id"),
                    published_at=row.get("linkedin_published_at"),
                    last_error=row.get("linkedin_error"),
                    manually_edited=bool(row.get("linkedin_manually_edited")),
                    created_at=row.get("created_at") or now,
                    modified_at=row.get("modified_at") or now,
                )
            )
            connection.execute(
                publications.update()
                .where(publications.c.id == row["id"])
                .values(linkedin_record_id=record_id)
            )
