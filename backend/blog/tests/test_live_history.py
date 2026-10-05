import asyncio
from datetime import datetime, timezone

import httpx
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from apps.linkedin_posts import routers as linkedin_routers
from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.models import LinkedInPost
from apps.linkedin_posts.schemas import RecentPost, TopicProposalRequest
from apps.linkedin_posts.services.history import LinkedInHistoryService
from apps.linkedin_posts.services.linkedin_client import LinkedInClient
from config.database import DatabaseManager


# Build the minimum persisted LinkedIn row needed by history enrichment tests.
def _post(post_id: str, provider_id: str, **updates) -> LinkedInPost:
    values = {
        "id": post_id,
        "content": "Local content",
        "topic": "Latency",
        "media_mode": "none",
        "media": [],
        "generation": {
            "style": "technical-analogy",
            "openingType": "statement",
            "hookSource": "TLE",
            "connection": {"from": "TLE", "to": "latency"},
        },
        "source_type": "INDEPENDENT_AI",
        "status": "PUBLISHED",
        "provider_post_id": provider_id,
        "manually_edited": False,
    }
    values.update(updates)
    return LinkedInPost(**values)


# Verify provider membership and chronology win while local metadata only enriches matches.
def test_live_history_handles_deleted_local_provider_only_and_db_only(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    LinkedInPost.__table__.create(engine)
    session = sessionmaker(bind=engine)()
    session.add_all(
        [
            _post("local-live", "urn:li:share:live", deleted_at=datetime.now(timezone.utc)),
            _post("db-only", "urn:li:share:missing", topic="Must not appear"),
        ]
    )
    session.commit()
    monkeypatch.setattr(DatabaseManager, "session", session)
    monkeypatch.setattr(
        "apps.linkedin_posts.services.history.settings.LINKEDIN_ORGANIZATION_URN",
        "urn:li:organization:123",
    )

    class FeedClient:
        # Return provider chronology that intentionally disagrees with local timestamps.
        async def find_organization_posts(self, _organization_urn, _limit):
            return [
                {
                    "id": "urn:li:share:provider-only",
                    "author": "urn:li:organization:123",
                    "lifecycleState": "PUBLISHED",
                    "visibility": "PUBLIC",
                    "distribution": {"feedDistribution": "MAIN_FEED"},
                    "commentary": "Provider opening\n\nProvider CTA\n#VietQuant",
                    "createdAt": 2_000,
                },
                {
                    "id": "urn:li:share:live",
                    "author": "urn:li:organization:123",
                    "lifecycleState": "PUBLISHED",
                    "visibility": "PUBLIC",
                    "distribution": {"feedDistribution": "MAIN_FEED"},
                    "commentary": "Published provider content",
                    "createdAt": 1_000,
                },
            ]

    items = asyncio.run(LinkedInHistoryService(FeedClient()).recent(5))

    assert [item.providerPostId for item in items] == [
        "urn:li:share:provider-only",
        "urn:li:share:live",
    ]
    assert items[0].topic == ""
    assert (items[0].opening, items[0].cta) == ("Provider opening", "Provider CTA")
    assert items[1].content == "Published provider content"
    assert (items[1].topic, items[1].style) == ("Latency", "technical-analogy")


# Reject malformed successful provider payloads instead of silently claiming empty history.
@pytest.mark.parametrize("payload", [None, {}, {"elements": "invalid"}, {"elements": [None]}])
def test_linkedin_feed_rejects_malformed_success(payload):
    # Return a successful HTTP response with an invalid Posts API envelope.
    def handler(request):
        return httpx.Response(200, json=payload, request=request)

    # Exercise the real async client against an in-memory HTTP transport.
    async def run():
        client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        try:
            return await LinkedInClient("token", "202601", client).find_organization_posts(
                "urn:li:organization:123"
            )
        finally:
            await client.aclose()

    with pytest.raises(LinkedInError) as error:
        asyncio.run(run())
    assert error.value.code == "invalid_response"


# Retry duplicate AI proposals within a fixed bound and keep manual generation unaffected.
def test_topic_proposal_retries_recent_and_batch_duplicates(monkeypatch):
    calls = []

    # Supply live history containing a topic that the first AI response repeats.
    async def recent(_self, _limit):
        return [RecentPost(topic="Latency")]

    class Provider:
        _owns_client = False

        # Accept production configuration without opening an HTTP client.
        def __init__(self, *_args):
            pass

        # Return one fresh topic per attempt around rejected duplicates.
        async def _request(self, _system, _prompt, _schema, _action):
            calls.append(1)
            return (
                {"topics": [" latency ", "Fresh A", "Fresh A"]}
                if len(calls) == 1
                else {"topics": ["Fresh B"]}
            )

    monkeypatch.setattr(linkedin_routers.LinkedInHistoryService, "recent", recent)
    monkeypatch.setattr(
        "apps.linkedin_posts.services.gemini.GeminiLinkedInProvider", Provider
    )

    result = asyncio.run(
        linkedin_routers.propose_topics.__wrapped__(
            request=None, response=None, data=TopicProposalRequest(count=2, recentLimit=5), _="admin"
        )
    )

    assert result == {"topics": ["Fresh A", "Fresh B"], "historySource": "linkedin"}
    assert len(calls) == 2
