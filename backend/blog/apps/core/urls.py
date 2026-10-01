"""Trusted public URL construction shared across application domains."""

from urllib.parse import quote

from config import settings


# Return the configured public site URL without a trailing slash.
def canonical_site_url() -> str:
    base = (settings.DOMAIN_URL or "").strip().rstrip("/")
    if not base:
        raise ValueError("DOMAIN_URL is required to build a canonical URL")
    return base


# Build the one canonical Blog URL from configured domain and trusted slug data.
def canonical_blog_url(link_post: str) -> str:
    if not link_post.strip():
        raise ValueError("Blog link_post is required to build a canonical URL")
    base = canonical_site_url()
    return f"{base}/blog/{quote(link_post.strip(), safe='-._~')}"
