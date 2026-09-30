"""Orchestrate Web publication and linked standalone LinkedIn posts."""

from fastapi import HTTPException, status

from apps.blogs.models import Blog
from apps.blogs.schemas import BlogState
from apps.core.urls import canonical_blog_url
from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.models import LinkedInPost
from apps.linkedin_posts.schemas import (
    LinkedInArticleSource,
    LinkedInMode as ProviderMode,
    LinkedInPostAction,
    LinkedInPostCreate,
    LinkedInPostStatus,
    LinkedInSourceType,
    MediaMode,
)
from apps.linkedin_posts.services.generator import (
    LinkedInDraftGenerator,
    append_canonical_link,
)
from apps.linkedin_posts.services.gemini import GeminiLinkedInProvider
from apps.linkedin_posts.services.pexels import PexelsService
from apps.linkedin_posts.services.posts import LinkedInPostService
from apps.publications.models import BlogPublication
from apps.publications.schemas import (
    DraftRequest,
    LinkedInCommandRequest,
    LinkedInContentUpdate,
    MediaSuggestionRequest,
    PublicationStatus,
    PublicationUpdate,
)
from config import settings
from config.database import DatabaseManager


# Normalize legacy media storage while old columns remain available for rollback.
def _legacy_media(publication: BlogPublication) -> tuple[str, list[dict]]:
    raw = publication.linkedin_media
    if isinstance(raw, dict):
        return str(raw.get("mode", MediaMode.NONE.value)), list(raw.get("items") or [])
    items = list(raw or [])
    mode = (
        MediaMode.NONE.value
        if not items
        else MediaMode.SINGLE.value if len(items) == 1 else MediaMode.MULTI.value
    )
    return mode, items


# Infer the exact provider media cardinality from reviewed selections.
def _media_mode(media: list[dict]) -> MediaMode:
    return (
        MediaMode.NONE
        if not media
        else MediaMode.SINGLE if len(media) == 1 else MediaMode.MULTI
    )


# Keep the compatibility response shape while reading LinkedIn state from its owner.
def _serialize(publication: BlogPublication, post: LinkedInPost | None = None) -> dict:
    legacy_mode, legacy_media = _legacy_media(publication)
    return {
        "id": publication.id,
        "blogId": publication.blog_id,
        "publishWeb": publication.publish_web,
        "publishLinkedin": publication.publish_linkedin,
        "linkedinMode": publication.linkedin_mode,
        "linkedinContent": post.content if post else publication.linkedin_content,
        "linkedinIncludeWebLink": publication.linkedin_include_web_link,
        "linkedinRecordId": post.id if post else publication.linkedin_record_id,
        "linkedinStatus": post.status if post else publication.linkedin_status,
        "linkedinPostId": (
            post.provider_post_id if post else publication.linkedin_post_id
        ),
        "linkedinPublishedAt": (
            post.published_at if post else publication.linkedin_published_at
        ),
        "linkedinError": post.last_error if post else publication.linkedin_error,
        "linkedinMediaMode": post.media_mode if post else legacy_mode,
        "linkedinMedia": post.media if post else legacy_media,
        "linkedinFactCheck": (
            post.fact_check if post else publication.linkedin_fact_check
        ),
        "linkedinGenerated": (
            post.generation if post else publication.linkedin_generation
        ),
    }


class PublicationService:
    """Own only Blog-to-LinkedIn association and Web-first ordering."""

    # Reuse the project session pattern for Blog and association records.
    @staticmethod
    def _session():
        return DatabaseManager.session

    # Load a Blog or return the CMS's established not-found response.
    @classmethod
    def _blog(cls, blog_id: str) -> Blog:
        blog = cls._session().get(Blog, blog_id)
        if not blog:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bài viết"
            )
        return blog

    # Read an association without creating state during preview generation.
    @classmethod
    def _find_publication(cls, blog_id: str) -> BlogPublication | None:
        return (
            cls._session()
            .query(BlogPublication)
            .filter(BlogPublication.blog_id == blog_id)
            .first()
        )

    # Create the Web-only compatibility association at the first persistence command.
    @classmethod
    def _publication(cls, blog_id: str) -> BlogPublication:
        publication = cls._find_publication(blog_id)
        if publication:
            return publication
        publication = BlogPublication(
            blog_id=blog_id,
            publish_web=True,
            publish_linkedin=False,
            linkedin_include_web_link=False,
            linkedin_status=PublicationStatus.NOT_SELECTED.value,
        )
        return cls._save(publication)

    # Persist one local mutation before any external side effect.
    @classmethod
    def _save(cls, value):
        session = cls._session()
        try:
            session.add(value)
            session.commit()
            session.refresh(value)
            return value
        except Exception:
            session.rollback()
            raise

    # Resolve the linked source-of-truth record when one exists.
    @staticmethod
    def _linked_post(publication: BlogPublication) -> LinkedInPost | None:
        return (
            LinkedInPost.get(publication.linkedin_record_id)
            if publication.linkedin_record_id
            else None
        )

    # Read publication state without consulting LinkedIn.
    @classmethod
    def get(cls, blog_id: str) -> dict:
        cls._blog(blog_id)
        publication = cls._publication(blog_id)
        return _serialize(publication, cls._linked_post(publication))

    # Save channel selection without publishing or mutating reviewed LinkedIn content.
    @classmethod
    def update(cls, blog_id: str, data: PublicationUpdate) -> dict:
        cls._blog(blog_id)
        publication = cls._publication(blog_id)
        post = cls._linked_post(publication)
        if post and (
            post.status == LinkedInPostStatus.PUBLISHED.value or post.provider_post_id
        ):
            publication.publish_web, publication.publish_linkedin = (
                data.publishWeb,
                data.publishLinkedin,
            )
            return _serialize(cls._save(publication), post)
        publication.publish_web = data.publishWeb
        publication.publish_linkedin = data.publishLinkedin
        publication.linkedin_mode = data.linkedinMode.value
        publication.linkedin_include_web_link = bool(data.linkedinIncludeWebLink)
        return _serialize(cls._save(publication), post)

    # Build a neutral Blog source with cross-domain LinkedIn generation history.
    @classmethod
    def _source(
        cls, blog: Blog, mode: ProviderMode, include_link: bool
    ) -> LinkedInArticleSource:
        return LinkedInArticleSource(
            title=blog.title,
            content=blog.content,
            category=str(blog.category),
            tags=[blog.tag] if blog.tag else [],
            canonicalUrl=canonical_blog_url(blog.link_post) if include_link else None,
            mode=mode,
            recentPosts=LinkedInPostService.generation_history(),
        )

    # Generate a review-only preview without creating or changing any database row.
    @classmethod
    async def draft(cls, blog_id: str, data: DraftRequest) -> dict:
        blog = cls._blog(blog_id)
        publication = cls._find_publication(blog_id)
        if data.includeWebLink and publication and not publication.publish_web:
            raise HTTPException(
                status_code=422,
                detail="Liên kết website cho LinkedIn yêu cầu phải xuất bản lên Website",
            )
        if data.mode.value == ProviderMode.CUSTOM.value:
            raise HTTPException(
                status_code=422,
                detail="Nội dung TÙY CHỈNH phải do quản trị viên cung cấp",
            )
        provider = GeminiLinkedInProvider(
            settings.GEMINI_API_KEY or "", settings.GEMINI_MODEL
        )
        try:
            result = await LinkedInDraftGenerator(provider).draft(
                cls._source(blog, ProviderMode(data.mode.value), data.includeWebLink)
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
        except LinkedInError as error:
            raise HTTPException(status_code=422, detail=error.as_dict()) from error
        finally:
            if provider._owns_client:
                await provider.client.aclose()

    # Persist reviewed Blog-derived content and optionally publish it in this request.
    @classmethod
    async def save_linkedin(cls, blog_id: str, data: LinkedInCommandRequest) -> dict:
        blog = cls._blog(blog_id)
        publication = cls._publication(blog_id)
        if data.action is LinkedInPostAction.PUBLISH_NOW:
            await LinkedInPostService.validate_configuration()
        media = [item.model_dump() for item in data.media]
        reviewed = LinkedInPostCreate(
            content=data.content,
            mediaMode=_media_mode(media),
            media=media,
            factCheck=data.factCheck,
            generation=data.generation,
            sourceType=LinkedInSourceType.BLOG_ADAPTATION,
            action=LinkedInPostAction.SAVE_DRAFT,
        )
        post = LinkedInPostService.save_reviewed(
            reviewed, publication.linkedin_record_id, ready=True
        )
        publication.publish_linkedin = True
        publication.linkedin_mode = data.mode.value
        publication.linkedin_include_web_link = data.includeWebLink
        publication.linkedin_record_id = post.id
        if data.includeWebLink:
            publication.publish_web = True
        cls._save(publication)
        if data.action is LinkedInPostAction.PUBLISH_NOW:
            await cls._publish_linked(blog, publication, post)
            post = LinkedInPostService.get(post.id)
        return _serialize(publication, post)

    # Keep the old edit route as a thin compatibility wrapper over LinkedInPost.
    @classmethod
    def save_custom(cls, blog_id: str, data: LinkedInContentUpdate) -> dict:
        cls._blog(blog_id)
        publication = cls._publication(blog_id)
        post = cls._linked_post(publication)
        content = (
            data.content if data.content is not None else post.content if post else None
        )
        if not content:
            raise HTTPException(
                status_code=422, detail="content is required before media can be saved"
            )
        media = (
            [item.model_dump() for item in data.media]
            if data.media is not None
            else list(post.media or []) if post else []
        )
        reviewed = LinkedInPostCreate(
            content=content,
            mediaMode=_media_mode(media),
            media=media,
            factCheck=post.fact_check if post else None,
            generation=None,
            sourceType=LinkedInSourceType.CUSTOM,
        )
        post = LinkedInPostService.save_reviewed(
            reviewed, post.id if post else None, ready=True
        )
        publication.publish_linkedin = True
        publication.linkedin_mode = ProviderMode.CUSTOM.value
        publication.linkedin_record_id = post.id
        return _serialize(cls._save(publication), post)

    # Search suggestions without modifying selected media or publication state.
    @classmethod
    async def suggest_media(cls, blog_id: str, data: MediaSuggestionRequest) -> dict:
        cls._blog(blog_id)
        publication = cls._publication(blog_id)
        post = cls._linked_post(publication)
        media = list(post.media or []) if post else _legacy_media(publication)[1]
        keywords = data.keywords or [
            keyword for item in media for keyword in item.get("searchKeywords", [])
        ]
        if not keywords:
            raise HTTPException(status_code=422, detail="Media keywords are required")
        service = PexelsService(settings.PEXELS_API_KEY)
        try:
            return {
                "items": [item.model_dump() for item in await service.search(keywords)]
            }
        finally:
            if service._owns_client:
                await service.client.aclose()

    # Publish Web first and pass canonical-link text in memory to the LinkedIn owner.
    @classmethod
    async def _publish_linked(
        cls,
        blog: Blog,
        publication: BlogPublication,
        post: LinkedInPost,
        *,
        retry: bool = False
    ) -> dict:
        LinkedInPostService._validate_media(post.media_mode, post.media or [])
        if publication.linkedin_include_web_link and not publication.publish_web:
            raise HTTPException(
                status_code=422,
                detail="Liên kết website cho LinkedIn yêu cầu phải xuất bản lên Website",
            )
        if publication.publish_web and blog.state != BlogState.APPROVED:
            blog.state = BlogState.APPROVED
            cls._save(blog)
        content = (
            append_canonical_link(post.content, canonical_blog_url(blog.link_post))
            if publication.linkedin_include_web_link
            else post.content
        )
        return await LinkedInPostService.publish(
            post.id, retry=retry, content_override=content
        )

    # Publish configured channels without regenerating or reselecting reviewed content.
    @classmethod
    async def publish(cls, blog_id: str, *, retry: bool = False) -> dict:
        blog = cls._blog(blog_id)
        publication = cls._publication(blog_id)
        post = cls._linked_post(publication)
        if publication.publish_linkedin and not post:
            raise HTTPException(
                status_code=422,
                detail="Cần lưu nội dung LinkedIn đã duyệt trước khi xuất bản",
            )
        if publication.publish_linkedin:
            await cls._publish_linked(blog, publication, post, retry=retry)
            post = LinkedInPostService.get(post.id)
        elif publication.publish_web and blog.state != BlogState.APPROVED:
            blog.state = BlogState.APPROVED
            cls._save(blog)
        return _serialize(publication, post)
