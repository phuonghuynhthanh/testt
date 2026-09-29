"""The only orchestration layer that coordinates Blog and LinkedIn domains."""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from pydantic import ValidationError

from apps.blogs.models import Blog
from apps.blogs.schemas import BlogState
from apps.core.urls import canonical_blog_url
from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.schemas import LinkedInArticleSource, LinkedInMode as ProviderMode, MediaMode, PexelsCandidate
from apps.linkedin_posts.services.generator import LinkedInDraftGenerator
from apps.linkedin_posts.services.gemini import GeminiLinkedInProvider
from apps.linkedin_posts.services.organization import OrganizationVerifier
from apps.linkedin_posts.services.pexels import PexelsService
from apps.linkedin_posts.services.publisher import OrganizationPublisher
from apps.publications.models import BlogPublication
from apps.publications.schemas import DraftRequest, LinkedInContentUpdate, MediaSuggestionRequest, PublicationStatus, PublicationUpdate
from config import settings
from config.database import DatabaseManager


# Normalize legacy list storage and current mode-aware media state.
def _media_state(publication: BlogPublication) -> tuple[str, list[dict]]:
    raw = publication.linkedin_media
    if isinstance(raw, dict):
        return str(raw.get("mode", MediaMode.NONE.value)), list(raw.get("items") or [])
    items = list(raw or [])
    mode = MediaMode.NONE.value if not items else MediaMode.SINGLE.value if len(items) == 1 else MediaMode.MULTI.value
    return mode, items


# Persist media mode and items together without adding another database column.
def _set_media(publication: BlogPublication, mode: str, items: list[dict]) -> None:
    publication.linkedin_media = {"mode": mode, "items": items}


# Build a JSON-safe publication response without leaking providers' configuration.
def _serialize(publication: BlogPublication) -> dict:
    media_mode, media = _media_state(publication)
    return {"id": publication.id, "blogId": publication.blog_id, "publishWeb": publication.publish_web, "publishLinkedin": publication.publish_linkedin, "linkedinMode": publication.linkedin_mode, "linkedinContent": publication.linkedin_content, "linkedinIncludeWebLink": publication.linkedin_include_web_link, "linkedinStatus": publication.linkedin_status, "linkedinPostId": publication.linkedin_post_id, "linkedinPublishedAt": publication.linkedin_published_at, "linkedinError": publication.linkedin_error, "linkedinMediaMode": media_mode, "linkedinMedia": media, "linkedinFactCheck": publication.linkedin_fact_check, "linkedinGenerated": getattr(publication, "linkedin_generation", None)}


class PublicationService:
    """Coordinate explicit Web then LinkedIn publishing without raw provider HTTP."""

    # Reuse the project session pattern while keeping all Blog imports in this boundary.
    @staticmethod
    def _session():
        return DatabaseManager.session

    # Load a Blog or return the CMS's established not-found response.
    @classmethod
    def _blog(cls, blog_id: str) -> Blog:
        blog = cls._session().get(Blog, blog_id)
        if not blog:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy bài viết")
        return blog

    # Create the legacy-safe default row on first access, effectively backfilling old Blogs.
    @classmethod
    def _publication(cls, blog_id: str) -> BlogPublication:
        session = cls._session()
        publication = session.query(BlogPublication).filter(BlogPublication.blog_id == blog_id).first()
        if publication:
            return publication
        publication = BlogPublication(blog_id=blog_id, publish_web=True, publish_linkedin=False, linkedin_include_web_link=False, linkedin_status=PublicationStatus.NOT_SELECTED.value)
        session.add(publication)
        session.commit()
        session.refresh(publication)
        return publication

    # Persist an atomic publication mutation and refresh its API representation.
    @classmethod
    def _save(cls, publication):
        session = cls._session()
        try:
            session.add(publication)
            session.commit()
            session.refresh(publication)
            return publication
        except Exception:
            session.rollback()
            raise

    # Read publication state, creating the Web-only compatibility row when missing.
    @classmethod
    def get(cls, blog_id: str) -> dict:
        cls._blog(blog_id)
        return _serialize(cls._publication(blog_id))

    # Validate and save independent channel selection without forcing draft content into Blog CRUD.
    @classmethod
    def update(cls, blog_id: str, data: PublicationUpdate) -> dict:
        cls._blog(blog_id)
        publication = cls._publication(blog_id)
        previous_mode = publication.linkedin_mode
        publication.publish_web, publication.publish_linkedin = data.publishWeb, data.publishLinkedin
        if publication.linkedin_status == PublicationStatus.PUBLISHED.value or publication.linkedin_post_id:
            publication.linkedin_status = PublicationStatus.PUBLISHED.value
            return _serialize(cls._save(publication))
        publication.linkedin_mode, publication.linkedin_include_web_link = data.linkedinMode.value, bool(data.linkedinIncludeWebLink)
        if previous_mode != data.linkedinMode.value:
            publication.linkedin_content = None
            publication.linkedin_fact_check = None
            publication.linkedin_generation = None
            publication.linkedin_manually_edited = False
            _set_media(publication, MediaMode.NONE.value, [])
            publication.linkedin_status = PublicationStatus.DRAFT.value if data.publishLinkedin else PublicationStatus.NOT_SELECTED.value
        elif not data.publishLinkedin:
            publication.linkedin_status = PublicationStatus.NOT_SELECTED.value
        elif publication.linkedin_status == PublicationStatus.NOT_SELECTED.value:
            publication.linkedin_status = PublicationStatus.DRAFT.value
        return _serialize(cls._save(publication))

    # Load the latest structured drafts so the proven diversity rules have real history.
    @classmethod
    def _recent_posts(cls, publication_id: str) -> list[dict]:
        rows = cls._session().query(BlogPublication.linkedin_generation).filter(BlogPublication.id != publication_id, BlogPublication.linkedin_generation.is_not(None)).order_by(BlogPublication.modified_at.desc()).limit(5).all()
        recent = []
        for row in rows:
            generated = row[0] if isinstance(row, tuple) else row.linkedin_generation
            if not isinstance(generated, dict) or not isinstance(generated.get("connection"), dict):
                continue
            lines = [line.strip() for line in str(generated.get("content", "")).splitlines() if line.strip()]
            recent.append({"topic": str(generated.get("insight", "")), "style": str(generated.get("style", "")), "openingType": str(generated.get("openingType", "")), "hookSource": str(generated.get("hookSource", "")), "connection": f"{generated['connection'].get('from', '')} -> {generated['connection'].get('to', '')}", "opening": lines[0] if lines else "", "cta": lines[-1] if lines else ""})
        return recent

    # Build the neutral source DTO so LinkedIn never imports the Blog domain.
    @classmethod
    def _source(cls, blog: Blog, publication: BlogPublication, mode: ProviderMode, include_link: bool) -> LinkedInArticleSource:
        if include_link and not publication.publish_web:
            raise HTTPException(status_code=422, detail="Liên kết website cho LinkedIn yêu cầu phải xuất bản lên Website")
        return LinkedInArticleSource(title=blog.title, content=blog.content, category=str(blog.category), tags=[blog.tag] if blog.tag else [], canonicalUrl=canonical_blog_url(blog.link_post) if include_link else None, mode=mode, recentPosts=cls._recent_posts(publication.id))

    # Generate a reviewable draft and never overwrite manually edited text without regenerate=true.
    @classmethod
    async def draft(cls, blog_id: str, data: DraftRequest) -> dict:
        blog, publication = cls._blog(blog_id), cls._publication(blog_id)
        if not publication.publish_linkedin:
            raise HTTPException(status_code=422, detail="Chưa chọn kênh LinkedIn cho bài viết này")
        if publication.linkedin_status == PublicationStatus.PUBLISHED.value or publication.linkedin_post_id:
            raise HTTPException(status_code=409, detail="Nội dung LinkedIn đã xuất bản không thể bị thay thế nếu không có luồng đăng lại")
        if data.mode.value == "CUSTOM":
            raise HTTPException(status_code=422, detail="Nội dung TÙY CHỈNH phải được lưu bằng PUT /linkedin")
        if publication.linkedin_manually_edited and not data.regenerate:
            raise HTTPException(status_code=409, detail="Bản nháp đã được chỉnh sửa thủ công; đặt regenerate=true để thay thế")
        include_link = data.includeWebLink
        if include_link and not publication.publish_web:
            raise HTTPException(status_code=422, detail="Chỉ xuất bản lên LinkedIn thì không thể đính kèm liên kết Website")
        provider = GeminiLinkedInProvider(settings.GEMINI_API_KEY or "", settings.GEMINI_MODEL)
        try:
            result = await LinkedInDraftGenerator(provider).draft(cls._source(blog, publication, ProviderMode(data.mode.value), include_link))
        except LinkedInError as error:
            raise HTTPException(status_code=422, detail=error.as_dict()) from error
        finally:
            if provider._owns_client:
                await provider.client.aclose()
        publication.linkedin_mode, publication.linkedin_content = data.mode.value, result.content
        publication.linkedin_include_web_link, publication.linkedin_status = include_link, PublicationStatus.READY.value
        _set_media(publication, result.media.mode.value, [item.model_dump() for item in result.media.images])
        publication.linkedin_fact_check, publication.linkedin_manually_edited = result.factualReview.model_dump(), False
        publication.linkedin_generation = result.generated.model_dump(by_alias=True) if result.generated else None
        return _serialize(cls._save(publication))

    # Save CUSTOM content as administrator-owned material without calling the generator.
    @classmethod
    def save_custom(cls, blog_id: str, data: LinkedInContentUpdate) -> dict:
        cls._blog(blog_id)
        publication = cls._publication(blog_id)
        if not publication.publish_linkedin:
            raise HTTPException(status_code=422, detail="Chưa chọn kênh LinkedIn cho bài viết này")
        if publication.linkedin_status == PublicationStatus.PUBLISHED.value or publication.linkedin_post_id:
            raise HTTPException(status_code=409, detail="Nội dung LinkedIn đã xuất bản không thể bị thay thế nếu không có luồng đăng lại")
        if publication.linkedin_include_web_link and not publication.publish_web:
            raise HTTPException(status_code=422, detail="Chỉ xuất bản lên LinkedIn thì không thể đính kèm liên kết Website")
        previous_mode, previous_items = _media_state(publication)
        if data.content is not None:
            publication.linkedin_mode, publication.linkedin_content = "CUSTOM", data.content.strip()
            publication.linkedin_generation, publication.linkedin_manually_edited = None, True
        if data.media is not None:
            selected = [item.model_dump() for item in data.media]
            selected_mode = MediaMode.NONE.value if not selected else MediaMode.SINGLE.value if len(selected) == 1 else MediaMode.MULTI.value
            if data.content is None and previous_items and previous_mode != selected_mode:
                raise HTTPException(status_code=422, detail=f"Hình ảnh được chọn phải phù hợp với chế độ {previous_mode} đã định")
            _set_media(publication, selected_mode, selected)
            publication.linkedin_manually_edited = True
        publication.linkedin_status = PublicationStatus.READY.value if publication.linkedin_content else PublicationStatus.DRAFT.value
        return _serialize(cls._save(publication))

    # Search suggestions from the persisted media plan or an explicitly supplied keyword list.
    @classmethod
    async def suggest_media(cls, blog_id: str, data: MediaSuggestionRequest) -> dict:
        cls._blog(blog_id)
        publication = cls._publication(blog_id)
        _, media = _media_state(publication)
        keywords = data.keywords or [keyword for item in media for keyword in item.get("searchKeywords", [])]
        service = PexelsService(settings.PEXELS_API_KEY)
        try:
            return {"items": [item.model_dump() for item in await service.search(keywords)]}
        except LinkedInError as error:
            raise HTTPException(status_code=422, detail=error.as_dict()) from error
        finally:
            if service._owns_client:
                await service.client.aclose()

    # Convert selected Pexels metadata to re-downloaded, byte-validated provider inputs.
    @classmethod
    async def _images(cls, publication: BlogPublication) -> list[tuple[object, str]]:
        mode, raw = _media_state(publication)
        expected = {MediaMode.NONE.value: (0, 0), MediaMode.SINGLE.value: (1, 1), MediaMode.MULTI.value: (2, 20)}.get(mode)
        if expected is None or not expected[0] <= len(raw) <= expected[1]:
            raise LinkedInError("invalid_input", f"Selected media does not match {mode} mode.")
        if not raw:
            return []
        try:
            selected = [PexelsCandidate.model_validate(item) for item in raw]
        except ValidationError as error:
            raise LinkedInError("invalid_input", "Every planned image must be replaced by a selected Pexels candidate before publishing.") from error
        service = PexelsService(settings.PEXELS_API_KEY)
        try:
            images = []
            for index, candidate in enumerate(sorted(selected, key=lambda value: value.order), 1):
                if candidate.order != index:
                    raise LinkedInError("invalid_input", "Selected media order must be sequential.")
                images.append((await service.download(candidate), candidate.altText))
            return images
        finally:
            if service._owns_client:
                await service.client.aclose()

    # Build a fresh organization publisher from private environment configuration.
    @classmethod
    def _publisher(cls) -> OrganizationPublisher:
        return OrganizationPublisher(OrganizationVerifier(settings.LINKEDIN_ACCESS_TOKEN, settings.LINKEDIN_CLIENT_ID, settings.LINKEDIN_CLIENT_SECRET, settings.LINKEDIN_ORGANIZATION_URN, settings.LINKEDIN_VERSION))

    # Execute Web first, then a single idempotent LinkedIn provider post with durable failure state.
    @classmethod
    async def publish(cls, blog_id: str, *, retry: bool = False) -> dict:
        blog, publication = cls._blog(blog_id), cls._publication(blog_id)
        if publication.linkedin_status == PublicationStatus.PUBLISHED.value or publication.linkedin_post_id:
            status_changed = publication.linkedin_status != PublicationStatus.PUBLISHED.value
            publication.linkedin_status = PublicationStatus.PUBLISHED.value
            if status_changed:
                cls._save(publication)
            if publication.publish_web and blog.state != BlogState.APPROVED:
                blog.state = BlogState.APPROVED
                cls._save(blog)
            return _serialize(publication)
        if publication.linkedin_status == PublicationStatus.REVIEW_REQUIRED.value:
            raise HTTPException(status_code=409, detail="Kết quả xuất bản LinkedIn không rõ ràng và cần người kiểm tra")
        if publication.linkedin_status == PublicationStatus.PUBLISHING.value:
            publication.linkedin_status = PublicationStatus.REVIEW_REQUIRED.value
            publication.linkedin_error = {"code": "ambiguous_publish", "message": "Lần xuất bản trước bị gián đoạn; vui lòng kiểm tra Trang Công ty trước khi thử lại.", "duplicateRisk": True}
            cls._save(publication)
            raise HTTPException(status_code=409, detail="Quá trình xuất bản LinkedIn bị gián đoạn và cần người kiểm tra")
        if retry and publication.linkedin_status != PublicationStatus.FAILED.value:
            raise HTTPException(status_code=409, detail="Chỉ có bài đăng LinkedIn thất bại mới có thể thử lại")
        publisher, images = None, []
        if publication.publish_linkedin:
            if not publication.linkedin_content:
                raise HTTPException(status_code=422, detail="Cần có nội dung bản nháp LinkedIn trước khi xuất bản")
            try:
                if publication.linkedin_include_web_link:
                    from apps.linkedin_posts.services.generator import append_canonical_link
                    publication.linkedin_content = append_canonical_link(publication.linkedin_content, canonical_blog_url(blog.link_post))
                publisher = cls._publisher()
                publisher.linkedin.validate()
                images = await cls._images(publication)
            except (LinkedInError, ValueError) as error:
                if publisher is not None:
                    await publisher.linkedin.close()
                detail = error.as_dict() if isinstance(error, LinkedInError) else str(error)
                raise HTTPException(status_code=422, detail=detail) from error
        if publication.publish_web:
            try:
                blog.state = BlogState.APPROVED
                cls._save(blog)
            except Exception:
                if publisher is not None:
                    await publisher.linkedin.close()
                raise
        if not publication.publish_linkedin:
            return _serialize(publication)
        publication.linkedin_status, publication.linkedin_error = PublicationStatus.PUBLISHING.value, None
        cls._save(publication)
        try:
            if not images:
                result = await publisher.publish_text(publication.linkedin_content)
            elif len(images) == 1:
                result = await publisher.publish_single_image(publication.linkedin_content, *images[0])
            else:
                result = await publisher.publish_multi_image(publication.linkedin_content, images)
            publication.linkedin_status, publication.linkedin_post_id = PublicationStatus.PUBLISHED.value, result.get("post_id")
            publication.linkedin_published_at = datetime.now(timezone.utc)
        except LinkedInError as error:
            publication.linkedin_error = error.as_dict()
            publication.linkedin_status = PublicationStatus.REVIEW_REQUIRED.value if error.duplicate_risk else PublicationStatus.FAILED.value
        except Exception:
            publication.linkedin_error = {"code": "ambiguous_publish", "message": "LinkedIn publication failed with an unknown outcome; verify the Company Page before retrying.", "duplicateRisk": True}
            publication.linkedin_status = PublicationStatus.REVIEW_REQUIRED.value
        finally:
            await publisher.linkedin.close()
        return _serialize(cls._save(publication))
