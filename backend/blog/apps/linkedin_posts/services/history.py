"""Provider-first LinkedIn Company Page history for AI diversity."""

from datetime import UTC, datetime

from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.models import LinkedInPost
from apps.linkedin_posts.schemas import RecentPost
from apps.linkedin_posts.services.linkedin_client import LinkedInClient
from config import settings
from config.database import DatabaseManager


# Return the first and final useful lines without manufacturing generation metadata.
def _lines(content: str) -> tuple[str, str]:
    lines = [line.strip() for line in content.splitlines() if line.strip()]
    meaningful = [line for line in lines if not line.startswith("#")]
    return (meaningful[0] if meaningful else "", meaningful[-1] if meaningful else "")


# Convert LinkedIn's timestamp variants into an API-friendly UTC datetime.
def _timestamp(value) -> datetime | None:
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value / 1000 if value > 10_000_000_000 else value, UTC)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


class LinkedInHistoryService:
    """Build recent history from the visible provider feed, then enrich locally."""

    # Keep client construction in the service so routers never know provider details.
    def __init__(self, client: LinkedInClient | None = None) -> None:
        self.client = client or LinkedInClient(settings.LINKEDIN_ACCESS_TOKEN, settings.LINKEDIN_VERSION)
        self._owns_client = client is None

    # Retain only organic, public Company Page posts visible to ordinary followers.
    @staticmethod
    def _visible(item: dict) -> bool:
        distribution = item.get("distribution") or {}
        return (
            item.get("author") == settings.LINKEDIN_ORGANIZATION_URN
            and item.get("lifecycleState") == "PUBLISHED"
            and item.get("visibility") == "PUBLIC"
            and distribution.get("feedDistribution", "MAIN_FEED") == "MAIN_FEED"
        )

    # Fetch provider feed first; a local row can enrich but never create feed membership.
    async def recent(self, limit: int = 5) -> list[RecentPost]:
        try:
            provider_posts = await self.client.find_organization_posts(settings.LINKEDIN_ORGANIZATION_URN, 50)
        except LinkedInError as error:
            raise LinkedInError("provider_history_unavailable", "LinkedIn Company Page history is unavailable; generation cannot safely enforce feed diversity.", error.provider_status, retryable=error.retryable, retry_after_ms=error.retry_after_ms) from error
        finally:
            if self._owns_client:
                await self.client.close()
        visible = [item for item in provider_posts if isinstance(item, dict) and self._visible(item)]
        visible.sort(key=lambda item: _timestamp(item.get("createdAt") or item.get("publishedAt")) or datetime.min.replace(tzinfo=UTC), reverse=True)
        identifiers = [str(item.get("id")) for item in visible if item.get("id")]
        with DatabaseManager.session as session:
            local = {row.provider_post_id: row for row in session.query(LinkedInPost).filter(LinkedInPost.provider_post_id.in_(identifiers)).all()} if identifiers else {}
        history = []
        for item in visible[:limit]:
            provider_id = str(item.get("id", "")) or None
            content = str(item.get("commentary", ""))
            opening, cta = _lines(content)
            row = local.get(provider_id)
            generated = row.generation if row and isinstance(row.generation, dict) else {}
            connection = generated.get("connection") if isinstance(generated.get("connection"), dict) else {}
            history.append(RecentPost(
                providerPostId=provider_id, topic=(row.topic or generated.get("insight", "")) if row else "",
                content=content, style=str(generated.get("style", "")), openingType=str(generated.get("openingType", "")),
                hookSource=str(generated.get("hookSource", "")), connection=f"{connection.get('from', '')} -> {connection.get('to', '')}".strip(" ->"),
                opening=opening, cta=cta, publishedAt=_timestamp(item.get("createdAt") or item.get("publishedAt")),
            ))
        return history
