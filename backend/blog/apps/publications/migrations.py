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
from slugify import slugify

from apps.core.date_time import DateTime
from apps.core.urls import canonical_blog_url

LEGACY_CATEGORY_NAMES = {
    "INVESTMENT_INSIGHTS",
    "FOREIGN_INVESTMENT",
    "KNOWLEDGE_BASE",
    "TUTORIALS",
    "CAREER",
    "NEWS",
}


# Retire comment links while preserving published and uncertain history.
def retire_comment_links(engine) -> None:
    with engine.begin() as connection:
        connection.execute(
            text(
                """
            UPDATE linkedin_posts SET link_placement = 'IN_POST'
            WHERE link_placement = 'FIRST_COMMENT'
              AND status IN ('DRAFT', 'READY', 'FAILED')
              AND provider_post_id IS NULL
        """
            )
        )
        connection.execute(
            text(
                """
            UPDATE post_publications
            SET linkedin_link_placement = 'IN_POST',
                linkedin_include_web_link = TRUE
            WHERE linkedin_link_placement = 'FIRST_COMMENT'
              AND linkedin_status IN (
                'NOT_SELECTED', 'DRAFT', 'READY', 'FAILED'
              )
              AND linkedin_post_id IS NULL
              AND (
                linkedin_record_id IS NULL
                OR linkedin_record_id IN (
                    SELECT id FROM linkedin_posts
                    WHERE link_placement = 'IN_POST'
                      AND status IN ('DRAFT', 'READY', 'FAILED')
                      AND provider_post_id IS NULL
                )
              )
        """
            )
        )


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
        Column("link_placement", String, nullable=False, default="NONE"),
        Column("status", String, nullable=False),
        Column("provider_post_id", String),
        Column("published_link_url", String),
        Column("link_comment_status", String, nullable=False, default="NOT_REQUESTED"),
        Column("provider_comment_id", String),
        Column("link_comment_error", JSON),
        Column("link_comment_published_at", SQLDateTime),
        Column("published_at", SQLDateTime),
        Column("last_error", JSON),
        Column("manually_edited", Boolean, nullable=False, default=False),
        Column("created_at", SQLDateTime),
        Column("modified_at", SQLDateTime),
    )
    metadata.create_all(engine, tables=[linkedin_posts])

    # Create categories before adding the Blog foreign key on legacy databases.
    metadata = MetaData()
    categories = Table(
        "categories", metadata,
        Column("id", String, primary_key=True), Column("name", String, nullable=False),
        Column("slug", String, nullable=False, unique=True), Column("created_at", SQLDateTime),
        Column("modified_at", SQLDateTime), Column("deleted_at", SQLDateTime),
    )
    metadata.create_all(engine, tables=[categories])

    # Add recoverable local state and topic metadata without discarding existing content.
    inspector = inspect(engine)
    with engine.begin() as connection:
        linkedin_columns = {column["name"] for column in inspector.get_columns("linkedin_posts")}
        publication_columns = {column["name"] for column in inspector.get_columns("post_publications")}
        publication_placement_added = "linkedin_link_placement" not in publication_columns
        post_placement_added = "link_placement" not in linkedin_columns
        if publication_placement_added:
            connection.execute(text("ALTER TABLE post_publications ADD COLUMN linkedin_link_placement VARCHAR NOT NULL DEFAULT 'NONE'"))
        if post_placement_added:
            connection.execute(text("ALTER TABLE linkedin_posts ADD COLUMN link_placement VARCHAR NOT NULL DEFAULT 'NONE'"))
        if "published_link_url" not in linkedin_columns:
            connection.execute(text("ALTER TABLE linkedin_posts ADD COLUMN published_link_url VARCHAR"))
        if "link_comment_status" not in linkedin_columns:
            connection.execute(text("ALTER TABLE linkedin_posts ADD COLUMN link_comment_status VARCHAR NOT NULL DEFAULT 'NOT_REQUESTED'"))
        if "provider_comment_id" not in linkedin_columns:
            connection.execute(text("ALTER TABLE linkedin_posts ADD COLUMN provider_comment_id VARCHAR"))
        if "link_comment_error" not in linkedin_columns:
            connection.execute(text("ALTER TABLE linkedin_posts ADD COLUMN link_comment_error JSON"))
        if "link_comment_published_at" not in linkedin_columns:
            connection.execute(text("ALTER TABLE linkedin_posts ADD COLUMN link_comment_published_at TIMESTAMP"))
        if "topic" not in linkedin_columns:
            connection.execute(text("ALTER TABLE linkedin_posts ADD COLUMN topic VARCHAR"))
        if "deleted_at" not in linkedin_columns:
            connection.execute(text("ALTER TABLE linkedin_posts ADD COLUMN deleted_at TIMESTAMP"))
        blog_columns = {column["name"] for column in inspector.get_columns("blogs")}
        if "deleted_at" not in blog_columns:
            connection.execute(text("ALTER TABLE blogs ADD COLUMN deleted_at TIMESTAMP"))
        if "category_id" not in blog_columns:
            connection.execute(
                text(
                    "ALTER TABLE blogs ADD COLUMN category_id VARCHAR REFERENCES categories(id)"
                )
            )

    # Backfill the authoritative placement once while preserving future choices.
    if publication_placement_added or post_placement_added:
        metadata = MetaData()
        publications = Table("post_publications", metadata, autoload_with=engine)
        linkedin_posts = Table("linkedin_posts", metadata, autoload_with=engine)
        with engine.begin() as connection:
            if publication_placement_added:
                connection.execute(
                    publications.update().values(
                        linkedin_link_placement=text(
                            "CASE WHEN linkedin_include_web_link THEN 'IN_POST' ELSE 'NONE' END"
                        )
                    )
                )
            if post_placement_added:
                rows = connection.execute(
                    select(
                        publications.c.linkedin_record_id,
                        publications.c.linkedin_link_placement,
                    ).where(publications.c.linkedin_record_id.is_not(None))
                ).all()
                for record_id, placement in rows:
                    connection.execute(
                        linkedin_posts.update()
                        .where(linkedin_posts.c.id == record_id)
                        .values(link_placement=placement or "NONE")
                    )

    # Backfill all historical values and seed every category from the removed enum.
    metadata = MetaData()
    blogs = Table("blogs", metadata, autoload_with=engine)
    publications = Table("post_publications", metadata, autoload_with=engine)
    with engine.begin() as connection:
        category_rows = connection.execute(select(blogs.c.category)).scalars().all() if "category" in blogs.c else []
        now = DateTime.now()
        names = LEGACY_CATEGORY_NAMES | {str(value).strip() for value in category_rows if value}
        for name in names:
            slug = slugify(name, separator="-")
            existing = connection.execute(select(categories.c.id).where(categories.c.slug == slug)).scalar_one_or_none()
            category_id = existing or str(uuid4())
            if not existing:
                connection.execute(categories.insert().values(id=category_id, name=name, slug=slug, created_at=now, modified_at=now))
            if "category" in blogs.c and "category_id" in blogs.c:
                connection.execute(blogs.update().where(blogs.c.category == name, blogs.c.category_id.is_(None)).values(category_id=category_id))
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
                        "linkedin_link_placement": "NONE",
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
                    media=(
                        media.get("items", [])
                        if isinstance(media, dict)
                        else media
                    ),
                    fact_check=row.get("linkedin_fact_check"),
                    generation=row.get("linkedin_generation"),
                    source_type="BLOG_ADAPTATION",
                    link_placement=(
                        row.get("linkedin_link_placement")
                        or (
                            "IN_POST"
                            if row.get("linkedin_include_web_link")
                            else "NONE"
                        )
                    ),
                    link_comment_status="NOT_REQUESTED",
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

        # Normalize canonical URLs only on legacy Blog schemas that own SEO data.
        if "link_post" in blogs.c and "seo" in blogs.c:
            for blog_id, link_post, seo in connection.execute(
                select(blogs.c.id, blogs.c.link_post, blogs.c.seo)
            ).all():
                if not isinstance(seo, dict):
                    continue
                try:
                    canonical_url = canonical_blog_url(link_post)
                except ValueError:
                    continue
                if seo.get("url") != canonical_url:
                    connection.execute(
                        blogs.update()
                        .where(blogs.c.id == blog_id)
                        .values(seo={**seo, "url": canonical_url})
                    )

    retire_comment_links(engine)

    # Retrofit the real foreign key on PostgreSQL databases upgraded by an earlier draft.
    inspector = inspect(engine)
    has_category_fk = any(
        foreign_key.get("referred_table") == "categories"
        and foreign_key.get("constrained_columns") == ["category_id"]
        for foreign_key in inspector.get_foreign_keys("blogs")
    )
    if engine.dialect.name == "postgresql" and not has_category_fk:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE blogs ADD CONSTRAINT fk_blogs_category_id_categories "
                    "FOREIGN KEY (category_id) REFERENCES categories(id)"
                )
            )
