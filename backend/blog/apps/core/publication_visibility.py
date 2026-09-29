"""Neutral SQL visibility predicate that avoids Blog-to-publications imports."""

from sqlalchemy import column, exists, select, table

publication_rows = table("post_publications", column("blog_id"), column("publish_web"))


# Treat unbackfilled legacy Blogs as Web-visible while honoring explicit channel rows.
def web_visible_clause(blog_id):
    matching_rows = publication_rows.c.blog_id == blog_id
    return ~exists(select(1).select_from(publication_rows).where(matching_rows)) | exists(select(1).select_from(publication_rows).where(matching_rows, publication_rows.c.publish_web.is_(True)))
