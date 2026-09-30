"""Standalone LinkedIn CRUD and provider-safe publication workflow."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import update

from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.models import LinkedInPost
from apps.linkedin_posts.schemas import (
    IndependentDraftRequest,
    LinkedInPostAction,
    LinkedInPostCreate,
    LinkedInPostStatus,
    LinkedInPostUpdate,
    MediaMode,
    PexelsCandidate,
)
from apps.linkedin_posts.services.generator import LinkedInDraftGenerator
from apps.linkedin_posts.services.gemini import GeminiLinkedInProvider
from apps.linkedin_posts.services.organization import OrganizationVerifier
from apps.linkedin_posts.services.pexels import PexelsService
from apps.linkedin_posts.services.publisher import OrganizationPublisher
from config import settings
from config.database import DatabaseManager


class LinkedInPostService:
    """Own standalone content state; publication services only orchestrate Blog links."""

    # Return a stable API record without provider credentials.
    @staticmethod
    def serialize(post: LinkedInPost) -> dict:
        return {
            "id": post.id,
            "content": post.content,
            "mediaMode": post.media_mode,
            "media": post.media or [],
            "factCheck": post.fact_check,
            "generation": post.generation,
            "sourceType": post.source_type,
            "status": post.status,
            "providerPostId": post.provider_post_id,
            "publishedAt": post.published_at,
            "lastError": post.last_error,
            "manuallyEdited": post.manually_edited,
            "createdAt": post.created_at,
            "modifiedAt": post.modified_at,
        }

    # Load one local record or use FastAPI's standard not-found response.
    @staticmethod
    def get(post_id: str) -> LinkedInPost:
        post = LinkedInPost.get(post_id)
        if not post:
            raise HTTPException(
                status_code=404, detail="Không tìm thấy bài đăng LinkedIn"
            )
        return post

    # Return all local history without any provider call.
    @classmethod
    def list(cls) -> list[dict]:
        return [
            cls.serialize(post)
            for post in LinkedInPost.filter(True)
            .order_by(LinkedInPost.modified_at.desc())
            .all()
        ]

    # Generate an independent preview and intentionally do not create a LinkedInPost.
    @classmethod
    async def generate_draft(cls, data: IndependentDraftRequest) -> dict:
        provider = GeminiLinkedInProvider(
            settings.GEMINI_API_KEY or "", settings.GEMINI_MODEL
        )
        try:
            result = await LinkedInDraftGenerator(provider).independent(
                data.topic,
                data.context,
                data.targetAudience,
                data.requestedMediaMode.value,
                cls.generation_history(),
            )
            return {
                "content": result.content,
                "media": result.media.model_dump(),
                "factualReview": result.factualReview.model_dump(),
                "generated": (
                    result.generated.model_dump(by_alias=True)
                    if result.generated
                    else {}
                ),
            }
        finally:
            if provider._owns_client:
                await provider.client.aclose()

    # Validate media shape before recording reviewed content.
    @staticmethod
    def _validate_media(mode: str, media: list[dict]) -> None:
        expected = {
            MediaMode.NONE.value: (0, 0),
            MediaMode.SINGLE.value: (1, 1),
            MediaMode.MULTI.value: (2, 20),
        }[mode]
        if not expected[0] <= len(media) <= expected[1]:
            raise HTTPException(
                status_code=422, detail="Selected media does not match mediaMode"
            )
        for item in media:
            PexelsCandidate.model_validate(item)

    # Save reviewed content through the single LinkedIn persistence boundary.
    @classmethod
    def save_reviewed(
        cls,
        data: LinkedInPostCreate,
        post_id: str | None = None,
        *,
        ready: bool = False,
    ) -> LinkedInPost:
        media = list(data.media)
        cls._validate_media(data.mediaMode.value, media)
        values = {
            "content": data.content.strip(),
            "media_mode": data.mediaMode.value,
            "media": media,
            "fact_check": data.factCheck,
            "generation": data.generation,
            "source_type": data.sourceType.value,
            "status": (
                LinkedInPostStatus.READY.value
                if ready
                else LinkedInPostStatus.DRAFT.value
            ),
            "last_error": None,
            "manually_edited": data.sourceType.value == "CUSTOM",
        }
        if not post_id:
            return LinkedInPost.create(**values)
        post = cls.get(post_id)
        if post.status not in {
            LinkedInPostStatus.DRAFT.value,
            LinkedInPostStatus.READY.value,
            LinkedInPostStatus.FAILED.value,
        }:
            raise HTTPException(
                status_code=409,
                detail="Published or uncertain LinkedIn posts cannot be edited",
            )
        return LinkedInPost.update(post_id, **values)

    # Validate local LinkedIn configuration before a one-request publish is persisted.
    @staticmethod
    async def validate_configuration() -> None:
        verifier = OrganizationVerifier(
            settings.LINKEDIN_ACCESS_TOKEN,
            settings.LINKEDIN_CLIENT_ID,
            settings.LINKEDIN_CLIENT_SECRET,
            settings.LINKEDIN_ORGANIZATION_URN,
            settings.LINKEDIN_VERSION,
        )
        try:
            verifier.linkedin.validate()
        finally:
            await verifier.linkedin.close()

    # Create locally before an explicit publish command can touch LinkedIn.
    @classmethod
    async def create(cls, data: LinkedInPostCreate) -> dict:
        if data.action is LinkedInPostAction.PUBLISH_NOW:
            await cls.validate_configuration()
        post = cls.save_reviewed(data)
        return (
            await cls.publish(post.id)
            if data.action is LinkedInPostAction.PUBLISH_NOW
            else cls.serialize(post)
        )

    # Return structured generation history shared by independent and Blog-derived AI.
    @classmethod
    def generation_history(cls, limit: int = 5) -> list[dict]:
        rows = (
            LinkedInPost.filter(LinkedInPost.generation.is_not(None))
            .order_by(LinkedInPost.modified_at.desc())
            .limit(limit)
            .all()
        )
        history = []
        for post in rows:
            generated = post.generation
            if not isinstance(generated, dict) or not isinstance(
                generated.get("connection"), dict
            ):
                continue
            lines = [
                line.strip()
                for line in str(generated.get("content", post.content)).splitlines()
                if line.strip()
            ]
            history.append(
                {
                    "topic": str(generated.get("insight", "")),
                    "style": str(generated.get("style", "")),
                    "openingType": str(generated.get("openingType", "")),
                    "hookSource": str(generated.get("hookSource", "")),
                    "connection": f"{generated['connection'].get('from', '')} -> {generated['connection'].get('to', '')}",
                    "opening": lines[0] if lines else "",
                    "cta": lines[-1] if lines else "",
                }
            )
        return history

    # Edit only states where a revised review can still be safely published.
    @classmethod
    def update(cls, post_id: str, data: LinkedInPostUpdate) -> dict:
        post = cls.get(post_id)
        if post.status not in {
            LinkedInPostStatus.DRAFT.value,
            LinkedInPostStatus.READY.value,
            LinkedInPostStatus.FAILED.value,
        }:
            raise HTTPException(
                status_code=409,
                detail="Published or uncertain LinkedIn posts cannot be edited",
            )
        values = data.model_dump(exclude_none=True)
        if "mediaMode" in values or "media" in values:
            cls._validate_media(
                (
                    values.get("mediaMode", post.media_mode).value
                    if hasattr(values.get("mediaMode", post.media_mode), "value")
                    else values.get("mediaMode", post.media_mode)
                ),
                values.get("media", post.media or []),
            )
        return cls.serialize(
            LinkedInPost.update(
                post_id,
                **{
                    "content": values.get("content", post.content),
                    "media_mode": (
                        values.get("mediaMode", post.media_mode).value
                        if hasattr(values.get("mediaMode", post.media_mode), "value")
                        else values.get("mediaMode", post.media_mode)
                    ),
                    "media": values.get("media", post.media),
                    "status": LinkedInPostStatus.READY.value,
                    "manually_edited": True,
                },
            )
        )

    # Remove only unpublished local content; external deletion is deliberately unsupported.
    @classmethod
    def delete(cls, post_id: str) -> None:
        post = cls.get(post_id)
        if post.status in {
            LinkedInPostStatus.PUBLISHED.value,
            LinkedInPostStatus.PUBLISHING.value,
            LinkedInPostStatus.REVIEW_REQUIRED.value,
        }:
            raise HTTPException(
                status_code=409, detail="This LinkedIn post cannot be deleted"
            )
        LinkedInPost.delete(post)

    # Re-download validated selected Pexels assets without replacing review choices.
    @staticmethod
    async def _images(post: LinkedInPost) -> list[tuple[object, str]]:
        service = PexelsService(settings.PEXELS_API_KEY)
        try:
            return [
                (
                    await service.download(PexelsCandidate.model_validate(item)),
                    PexelsCandidate.model_validate(item).altText,
                )
                for item in sorted(post.media or [], key=lambda item: item["order"])
            ]
        finally:
            if service._owns_client:
                await service.client.aclose()

    # Search Pexels from explicitly requested terms without changing saved media.
    @staticmethod
    async def suggest_media(post_id: str, keywords: list[str] | None = None) -> dict:
        post = LinkedInPostService.get(post_id)
        selected = post.media or []
        terms = keywords or [
            term for item in selected for term in item.get("searchKeywords", [])
        ]
        if not terms:
            raise HTTPException(status_code=422, detail="Media keywords are required")
        service = PexelsService(settings.PEXELS_API_KEY)
        try:
            return {
                "items": [item.model_dump() for item in await service.search(terms)]
            }
        finally:
            if service._owns_client:
                await service.client.aclose()

    # Atomically claim a publish so concurrent requests cannot both call LinkedIn.
    @staticmethod
    def _claim_publish(post: LinkedInPost) -> bool:
        with DatabaseManager.engine.begin() as connection:
            result = connection.execute(
                update(LinkedInPost)
                .where(LinkedInPost.id == post.id, LinkedInPost.status == post.status)
                .values(
                    status=LinkedInPostStatus.PUBLISHING.value,
                    last_error=None,
                    modified_at=datetime.now(timezone.utc),
                )
            )
        return result.rowcount == 1

    # Move only genuinely stale interrupted work to manual review.
    @classmethod
    def _publishing_state(cls, post: LinkedInPost) -> dict:
        modified = post.modified_at
        if modified and modified.tzinfo is None:
            modified = modified.replace(tzinfo=timezone.utc)
        if modified and datetime.now(timezone.utc) - modified >= timedelta(minutes=5):
            post = LinkedInPost.update(
                post.id,
                status=LinkedInPostStatus.REVIEW_REQUIRED.value,
                last_error={"code": "ambiguous_publish", "duplicateRisk": True},
            )
        return cls.serialize(post)

    # Publish exactly the stored reviewed content after atomically committing PUBLISHING.
    @classmethod
    async def publish(
        cls, post_id: str, *, retry: bool = False, content_override: str | None = None
    ) -> dict:
        post = cls.get(post_id)
        if post.status == LinkedInPostStatus.PUBLISHED.value or post.provider_post_id:
            return cls.serialize(post)
        if post.status == LinkedInPostStatus.PUBLISHING.value:
            return cls._publishing_state(post)
        if post.status == LinkedInPostStatus.REVIEW_REQUIRED.value:
            raise HTTPException(
                status_code=409,
                detail="This LinkedIn post cannot be retried automatically",
            )
        if retry and post.status != LinkedInPostStatus.FAILED.value:
            raise HTTPException(
                status_code=409, detail="Only failed LinkedIn posts can be retried"
            )
        if not retry and post.status == LinkedInPostStatus.FAILED.value:
            raise HTTPException(
                status_code=409,
                detail="Use the retry command for a failed LinkedIn post",
            )
        cls._validate_media(post.media_mode, post.media or [])
        if not cls._claim_publish(post):
            current = cls.get(post.id)
            return (
                cls._publishing_state(current)
                if current.status == LinkedInPostStatus.PUBLISHING.value
                else cls.serialize(current)
            )
        post = cls.get(post.id)
        publisher = OrganizationPublisher(
            OrganizationVerifier(
                settings.LINKEDIN_ACCESS_TOKEN,
                settings.LINKEDIN_CLIENT_ID,
                settings.LINKEDIN_CLIENT_SECRET,
                settings.LINKEDIN_ORGANIZATION_URN,
                settings.LINKEDIN_VERSION,
            )
        )
        try:
            images = await cls._images(post)
            content = content_override or post.content
            result = await (
                publisher.publish_text(content)
                if not images
                else (
                    publisher.publish_single_image(content, *images[0])
                    if len(images) == 1
                    else publisher.publish_multi_image(content, images)
                )
            )
            post = LinkedInPost.update(
                post.id,
                status=LinkedInPostStatus.PUBLISHED.value,
                provider_post_id=result.get("post_id"),
                published_at=datetime.now(timezone.utc),
                last_error=None,
            )
        except LinkedInError as error:
            post = LinkedInPost.update(
                post.id,
                status=(
                    LinkedInPostStatus.REVIEW_REQUIRED.value
                    if error.duplicate_risk
                    else LinkedInPostStatus.FAILED.value
                ),
                last_error=error.as_dict(),
            )
        except Exception:
            post = LinkedInPost.update(
                post.id,
                status=LinkedInPostStatus.REVIEW_REQUIRED.value,
                last_error={"code": "ambiguous_publish", "duplicateRisk": True},
            )
        finally:
            await publisher.linkedin.close()
        return cls.serialize(post)
