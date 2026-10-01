"""Standalone LinkedIn CRUD and provider-safe publication workflow."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import update

from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.models import LinkedInPost
from apps.linkedin_posts.schemas import (
    IndependentDraftRequest,
    LinkedInCommentStatus,
    LinkedInLinkPlacement,
    LinkedInPostAction,
    LinkedInPostCreate,
    LinkedInPostStatus,
    LinkedInPostUpdate,
    MediaMode,
    PexelsCandidate,
    UploadedMedia,
)
from apps.core.urls import canonical_site_url
from apps.linkedin_posts.services.image import validate_image_bytes
from apps.linkedin_posts.services.generator import LinkedInDraftGenerator
from apps.linkedin_posts.services.history import LinkedInHistoryService
from apps.linkedin_posts.services.gemini import GeminiLinkedInProvider
from apps.linkedin_posts.services.organization import OrganizationVerifier
from apps.linkedin_posts.services.pexels import PexelsService
from apps.linkedin_posts.services.publisher import OrganizationPublisher
from apps.core.storage import StorageService
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
            "topic": post.topic,
            "mediaMode": post.media_mode,
            "media": post.media or [],
            "factCheck": post.fact_check,
            "generation": post.generation,
            "sourceType": post.source_type,
            "linkPlacement": getattr(post, "link_placement", LinkedInLinkPlacement.NONE.value),
            "status": post.status,
            "providerPostId": post.provider_post_id,
            "publishedLinkUrl": getattr(post, "published_link_url", None),
            "linkCommentStatus": getattr(post, "link_comment_status", LinkedInCommentStatus.NOT_REQUESTED.value),
            "providerCommentId": getattr(post, "provider_comment_id", None),
            "linkCommentError": getattr(post, "link_comment_error", None),
            "linkCommentPublishedAt": getattr(post, "link_comment_published_at", None),
            "publishedAt": post.published_at,
            "lastError": post.last_error,
            "manuallyEdited": post.manually_edited,
            "deletedAt": post.deleted_at,
            "createdAt": post.created_at,
            "modifiedAt": post.modified_at,
        }

    # Load one local record or use FastAPI's standard not-found response.
    @staticmethod
    def get(post_id: str, include_deleted: bool = False) -> LinkedInPost:
        post = LinkedInPost.get(post_id)
        if post and post.deleted_at and not include_deleted:
            post = None
        if not post:
            raise HTTPException(
                status_code=404, detail="Không tìm thấy bài đăng LinkedIn"
            )
        return LinkedInPostService._comment_state(post)

    # Return all local history without any provider call.
    @classmethod
    def list(cls, page: int = 1, page_size: int = 20, status: str | None = None, source_type: str | None = None) -> dict:
        query = LinkedInPost.filter(LinkedInPost.deleted_at.is_(None))
        if status:
            query = query.filter(LinkedInPost.status == status)
        if source_type:
            query = query.filter(LinkedInPost.source_type == source_type)
        total = query.count()
        posts = query.order_by(LinkedInPost.modified_at.desc(), LinkedInPost.id.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return {"items": [cls.serialize(post) for post in posts], "page": page, "pageSize": page_size, "total": total, "totalPages": (total + page_size - 1) // page_size}

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
                [item.model_dump(mode="json") for item in await LinkedInHistoryService().recent()],
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
            if item.get("provider") == "upload":
                UploadedMedia.model_validate(item)
            else:
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
        media = [item.model_dump() for item in data.media]
        cls._validate_media(data.mediaMode.value, media)
        values = {
            "content": data.content.strip(),
            "topic": data.topic.strip() if data.topic else None,
            "media_mode": data.mediaMode.value,
            "media": media,
            "fact_check": data.factCheck,
            "generation": data.generation,
            "source_type": data.sourceType.value,
            "link_placement": data.linkPlacement.value,
            "status": (
                LinkedInPostStatus.READY.value
                if ready
                else LinkedInPostStatus.DRAFT.value
            ),
            "last_error": None,
            "published_link_url": None,
            "link_comment_status": LinkedInCommentStatus.NOT_REQUESTED.value,
            "provider_comment_id": None,
            "link_comment_error": None,
            "link_comment_published_at": None,
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
                    "topic": values.get("topic", post.topic),
                    "media_mode": (
                        values.get("mediaMode", post.media_mode).value
                        if hasattr(values.get("mediaMode", post.media_mode), "value")
                        else values.get("mediaMode", post.media_mode)
                    ),
                    "media": values.get("media", post.media),
                    "fact_check": values.get("factCheck", post.fact_check),
                    "generation": values.get("generation", post.generation),
                    "source_type": (
                        values.get("sourceType", post.source_type).value
                        if hasattr(values.get("sourceType", post.source_type), "value")
                        else values.get("sourceType", post.source_type)
                    ),
                    "link_placement": (
                        values.get("linkPlacement", getattr(post, "link_placement", LinkedInLinkPlacement.NONE.value)).value
                        if hasattr(values.get("linkPlacement", getattr(post, "link_placement", LinkedInLinkPlacement.NONE.value)), "value")
                        else values.get("linkPlacement", getattr(post, "link_placement", LinkedInLinkPlacement.NONE.value))
                    ),
                    "status": LinkedInPostStatus.READY.value,
                    "published_link_url": None,
                    "link_comment_status": LinkedInCommentStatus.NOT_REQUESTED.value,
                    "provider_comment_id": None,
                    "link_comment_error": None,
                    "link_comment_published_at": None,
                    "manually_edited": True,
                },
            )
        )

    # Soft-delete only local content; the external Company Page post is intentionally untouched.
    @classmethod
    def delete(cls, post_id: str) -> None:
        post = cls.get(post_id)
        LinkedInPost.update(post.id, deleted_at=datetime.now(timezone.utc))

    # Restore a local CMS record without any provider side effect.
    @classmethod
    def restore(cls, post_id: str) -> dict:
        post = cls.get(post_id, include_deleted=True)
        return cls.serialize(LinkedInPost.update(post.id, deleted_at=None))

    # Resolve ordered Pexels and administrator uploads into byte-validated images.
    @staticmethod
    async def _images(post: LinkedInPost) -> list[tuple[object, str]]:
        service = PexelsService(settings.PEXELS_API_KEY)
        try:
            images = []
            for item in sorted(post.media or [], key=lambda value: value["order"]):
                if item.get("provider") == "upload":
                    upload = UploadedMedia.model_validate(item)
                    try:
                        content = StorageService.read_image_bytes(
                            upload.objectKey,
                            settings.MEDIA_MAX_UPLOAD_MB * 1024 * 1024,
                        )
                    except HTTPException as error:
                        raise LinkedInError("invalid_image", str(error.detail)) from error
                    images.append((validate_image_bytes(content), upload.altText))
                else:
                    candidate = PexelsCandidate.model_validate(item)
                    images.append((await service.download(candidate), candidate.altText))
            return images
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

    # Resolve the only backend-owned target URL for a placement-enabled post.
    @staticmethod
    def _link_target(post: LinkedInPost, link_url: str | None) -> str | None:
        placement = LinkedInLinkPlacement(
            getattr(post, "link_placement", LinkedInLinkPlacement.NONE.value)
        )
        if placement is LinkedInLinkPlacement.NONE:
            return None
        if link_url:
            return link_url.rstrip("/")
        try:
            return canonical_site_url()
        except ValueError as error:
            raise HTTPException(status_code=422, detail="DOMAIN_URL is required for LinkedIn links") from error

    # Build deterministic link copy without modifying the stored reviewed content.
    @staticmethod
    def _link_text(post: LinkedInPost, target_url: str) -> str:
        label = "Đọc bài đầy đủ:" if post.source_type == "BLOG_ADAPTATION" else "Tìm hiểu thêm về VietQuant:"
        return f"{label}\n{target_url}"

    # Append the server-owned URL once to the in-memory provider payload.
    @classmethod
    def _publish_content(cls, post: LinkedInPost, target_url: str | None) -> str:
        placement = LinkedInLinkPlacement(
            getattr(post, "link_placement", LinkedInLinkPlacement.NONE.value)
        )
        if placement is not LinkedInLinkPlacement.IN_POST or not target_url:
            return post.content
        if target_url in post.content:
            return post.content
        return f"{post.content.strip()}\n\n{cls._link_text(post, target_url)}"

    # Atomically reserve a confirmed failed comment for one safe retry.
    @staticmethod
    def _claim_comment(post_id: str) -> bool:
        with DatabaseManager.engine.begin() as connection:
            result = connection.execute(
                update(LinkedInPost)
                .where(
                    LinkedInPost.id == post_id,
                    LinkedInPost.status == LinkedInPostStatus.PUBLISHED.value,
                    LinkedInPost.link_placement == LinkedInLinkPlacement.FIRST_COMMENT.value,
                    LinkedInPost.link_comment_status == LinkedInCommentStatus.FAILED.value,
                )
                .values(
                    link_comment_status=LinkedInCommentStatus.PENDING.value,
                    link_comment_error=None,
                    modified_at=datetime.now(timezone.utc),
                )
            )
        return result.rowcount == 1

    # Persist a comment result without changing the already-published main post.
    @classmethod
    async def _create_link_comment(cls, post: LinkedInPost, publisher: OrganizationPublisher) -> LinkedInPost:
        try:
            result = await publisher.create_organization_comment(
                post.provider_post_id,
                cls._link_text(post, post.published_link_url),
            )
            return LinkedInPost.update(
                post.id,
                link_comment_status=LinkedInCommentStatus.PUBLISHED.value,
                provider_comment_id=result["comment_id"],
                link_comment_error=None,
                link_comment_published_at=datetime.now(timezone.utc),
            )
        except LinkedInError as error:
            return LinkedInPost.update(
                post.id,
                link_comment_status=(
                    LinkedInCommentStatus.REVIEW_REQUIRED.value
                    if error.duplicate_risk
                    else LinkedInCommentStatus.FAILED.value
                ),
                link_comment_error=error.as_dict(),
            )
        except Exception:
            return LinkedInPost.update(
                post.id,
                link_comment_status=LinkedInCommentStatus.REVIEW_REQUIRED.value,
                link_comment_error={"code": "ambiguous_comment", "duplicateRisk": True},
            )

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

    # Move an abandoned comment reservation to manual review to avoid duplicates.
    @classmethod
    def _comment_state(cls, post: LinkedInPost) -> LinkedInPost:
        if getattr(post, "link_comment_status", None) != LinkedInCommentStatus.PENDING.value:
            return post
        modified = post.modified_at
        if modified and modified.tzinfo is None:
            modified = modified.replace(tzinfo=timezone.utc)
        if modified and datetime.now(timezone.utc) - modified >= timedelta(minutes=5):
            return LinkedInPost.update(
                post.id,
                link_comment_status=LinkedInCommentStatus.REVIEW_REQUIRED.value,
                link_comment_error={"code": "ambiguous_comment", "duplicateRisk": True},
            )
        return post

    # Publish exactly the stored reviewed content after atomically committing PUBLISHING.
    @classmethod
    async def publish(
        cls, post_id: str, *, retry: bool = False, link_url: str | None = None
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
        target_url = cls._link_target(post, link_url)
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
            content = cls._publish_content(post, target_url)
            needs_comment = (
                LinkedInLinkPlacement(
                    getattr(post, "link_placement", LinkedInLinkPlacement.NONE.value)
                )
                is LinkedInLinkPlacement.FIRST_COMMENT
            )
            result = await (
                publisher.publish_text(content, needs_comment)
                if not images
                else (
                    publisher.publish_single_image(content, *images[0], needs_comment=needs_comment)
                    if len(images) == 1
                    else publisher.publish_multi_image(content, images, needs_comment=needs_comment)
                )
            )
            provider_post_id = result.get("post_id")
            comment_status = (
                LinkedInCommentStatus.PENDING.value
                if needs_comment and provider_post_id
                else (
                    LinkedInCommentStatus.REVIEW_REQUIRED.value
                    if needs_comment
                    else LinkedInCommentStatus.NOT_REQUESTED.value
                )
            )
            post = LinkedInPost.update(
                post.id,
                status=LinkedInPostStatus.PUBLISHED.value,
                provider_post_id=provider_post_id,
                published_link_url=target_url,
                link_comment_status=comment_status,
                link_comment_error=(
                    {"code": "missing_provider_post_id", "duplicateRisk": True}
                    if needs_comment and not provider_post_id
                    else None
                ),
                published_at=datetime.now(timezone.utc),
                last_error=None,
            )
            if needs_comment and provider_post_id:
                post = await cls._create_link_comment(post, publisher)
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

    # Retry only a locally confirmed failed first-comment request.
    @classmethod
    async def retry_link_comment(cls, post_id: str) -> dict:
        post = cls.get(post_id)
        if post.status != LinkedInPostStatus.PUBLISHED.value:
            raise HTTPException(status_code=409, detail="Main LinkedIn post is not published")
        if LinkedInLinkPlacement(post.link_placement) is not LinkedInLinkPlacement.FIRST_COMMENT:
            raise HTTPException(status_code=409, detail="This post does not use a first-comment link")
        if post.link_comment_status != LinkedInCommentStatus.FAILED.value:
            raise HTTPException(status_code=409, detail="Only failed link comments can be retried")
        if not post.provider_post_id or not post.published_link_url:
            raise HTTPException(status_code=409, detail="The published post cannot be safely targeted")
        if not cls._claim_comment(post.id):
            return cls.serialize(cls.get(post.id))
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
            post = await cls._create_link_comment(post, publisher)
        finally:
            await publisher.linkedin.close()
        return cls.serialize(post)
