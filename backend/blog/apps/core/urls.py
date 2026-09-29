"""Trusted public URL construction shared across application domains."""

from urllib.parse import quote

from config import settings


# Build the one canonical Blog URL from configured domain and trusted slug data.
def canonical_blog_url(link_post: str) -> str:
    base = (settings.DOMAIN_URL or "").strip().rstrip("/")
    if not base or not link_post.strip():
        raise ValueError("DOMAIN_URL and Blog link_post are required to build a canonical URL")
    return f"{base}/blog/{quote(link_post.strip(), safe='-._~')}"
