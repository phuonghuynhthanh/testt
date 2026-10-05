from contextlib import contextmanager
import logging
from datetime import timedelta
from typing import Optional
from fastapi import HTTPException, UploadFile, status
from slugify import slugify
from sqlalchemy import desc, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from apps.blogs import schemas
from apps.blogs.models import Blog
from apps.categories.models import Category
from apps.core.storage import StorageService
from apps.core.date_time import DateTime
from apps.core.publication_visibility import web_visible_clause
from apps.core.urls import canonical_blog_url
from apps.core.language import PostLanguage
from apps.openai.services.gemini_ai import GeminiAiService
from config import settings
from config.database import DatabaseManager

logger = logging.getLogger(__name__)


class BlogServices:
    SLUG_INSERT_ATTEMPTS = 8

    # Normalize a display name into the durable category lookup key.
    @staticmethod
    def _category_slug(name: str) -> str:
        return slugify(name.strip(), separator="-")

    # Reuse, restore, or create a category only at a Blog persistence boundary.
    @classmethod
    def resolve_category(cls, name: str) -> Category:
        slug = cls._category_slug(name)
        if not slug:
            raise HTTPException(status_code=422, detail="Category is required")
        with cls.get_db_session() as session:
            category = session.query(Category).filter(Category.slug == slug).first()
            if category:
                category.name, category.deleted_at = name.strip(), None
            else:
                category = Category(name=name.strip(), slug=slug)
                session.add(category)
            try:
                session.commit()
            except IntegrityError:
                # Reuse the row won by a concurrent request instead of exposing a duplicate error.
                session.rollback()
                category = session.query(Category).filter(Category.slug == slug).one()
                category.name, category.deleted_at = name.strip(), None
                session.commit()
            session.refresh(category)
            return category

    @staticmethod
    @contextmanager
    def get_db_session():
        """Context manager for database sessions"""
        session = DatabaseManager.session
        try:
            yield session
        finally:
            session.close()

    # Delete a banner without turning best-effort storage cleanup into API failure.
    @staticmethod
    def delete_image_url(url: str) -> None:
        if url:
            try:
                StorageService.delete_image(url)
            except Exception:
                pass

    # Build JSON-safe SEO metadata while preserving an existing publication timestamp.
    @staticmethod
    def _create_seo_data(
        seo_input: schemas.SEODataSchema,
        banner_url: Optional[str],
        link_post: str,
        is_update: bool = False,
        existing_published_time: str = None,
    ) -> dict:
        """Create SEO data dictionary"""
        current_time = str(DateTime.now())
        return {
            "title": seo_input.title,
            "description": seo_input.description,
            "banner_url": banner_url,
            "url": canonical_blog_url(link_post),
            "keywords": seo_input.keywords,
            "author": seo_input.author,
            "published_time": (existing_published_time or current_time) if is_update else current_time,
            "modified_time": current_time,
        }

    # Return the first available durable slug, including soft-deleted records.
    @staticmethod
    def _next_slug(session: Session, title: str) -> str:
        base = slugify(title, lowercase=True, separator="-") or "blog"
        values = {
            value
            for value in session.scalars(
                select(Blog.link_post).where(
                    or_(Blog.link_post == base, Blog.link_post.like(f"{base}-%"))
                )
            )
        }
        used = {1} if base in values else set()
        prefix = f"{base}-"
        for value in values:
            if value.startswith(prefix) and value[len(prefix):].isdigit():
                suffix = int(value[len(prefix):])
                if suffix >= 2:
                    used.add(suffix)
        suffix = 1
        while suffix in used:
            suffix += 1
        return base if suffix == 1 else f"{base}-{suffix}"

    # Create reviewed Blog content with an explicit save or publish action.
    @classmethod
    def create_blog(
        cls,
        blog_data: schemas.BlogCreate,
        image: Optional[UploadFile] = None,
        action: schemas.BlogCreateAction = schemas.BlogCreateAction.SAVE_PENDING,
    ):
        """
        Creates a new blog with the provided data.
        If the blog already exists, it raises an HTTPException.
        """
        # Track only objects created by this request so rollback cannot delete old data.
        banner_url = blog_data.banner_url or ""
        uploaded_banner_url = None
        try:
            with Session(DatabaseManager.engine) as session:
                initial_slug = cls._next_slug(session, blog_data.title)
            if image:
                banner_url = StorageService.upload_image(
                    image, folder=initial_slug
                )
                uploaded_banner_url = banner_url
            category = cls.resolve_category(str(blog_data.category))
            for _ in range(cls.SLUG_INSERT_ATTEMPTS):
                with Session(DatabaseManager.engine) as session:
                    slug = cls._next_slug(session, blog_data.title)
                    try:
                        blog = Blog(
                            tag=blog_data.tag,
                            title=blog_data.title,
                            banner_url=banner_url,
                            link_post=slug,
                            content=blog_data.content,
                            state=(
                                schemas.BlogState.APPROVED
                                if action is schemas.BlogCreateAction.PUBLISH_NOW
                                else schemas.BlogState.PENDING
                            ),
                            category=category.name,
                            category_id=category.id,
                            seo=cls._create_seo_data(blog_data.seo, banner_url, slug),
                        )
                        session.add(blog)
                        session.commit()
                        session.refresh(blog)
                        session.expunge(blog)
                        return blog
                    except IntegrityError:
                        session.rollback()
                        if session.scalar(select(Blog.id).where(Blog.link_post == slug)):
                            continue
                        raise
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Không thể cấp đường dẫn bài viết duy nhất. Hãy thử lại.",
            )
        except IntegrityError:
            cls.delete_image_url(uploaded_banner_url)
            raise
        except HTTPException:
            cls.delete_image_url(uploaded_banner_url)
            raise
        except Exception:
            cls.delete_image_url(uploaded_banner_url)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Tạo bài viết thất bại",
            )
    # Apply partial edits and state changes without introducing datetime values into JSON.
    @classmethod
    def update_blog(
        cls,
        id: str,
        data: Optional[schemas.BlogUpdate] = None,
        image: Optional[UploadFile] = None,
    ):
        """
        Updates an existing blog with the provided data.
        If the blog is not found, it raises an HTTPException.
        """
        uploaded_banner_url = None
        try:
            with cls.get_db_session() as session:
                blog = session.query(Blog).filter(
                    (Blog.id == id) & Blog.deleted_at.is_(None)
                ).first()

            if not blog:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy bài viết",
                )

            update_data = {"modified_at": DateTime.now()}

            field_mappings = {
                "title": data.title,
                "content": data.content,
                "tag": data.tag,
                "state": data.state,
                "category": data.category,
            }

            for field_name, field_value in field_mappings.items():
                if field_value is not None:
                    update_data[field_name] = field_value
            if data.category is not None:
                category = cls.resolve_category(data.category)
                update_data.update(category=category.name, category_id=category.id)
            new_banner_url = blog.banner_url
            if image is not None:
                folder_for_new_banner = blog.link_post
                new_banner_url = StorageService.upload_image(
                    image, folder=folder_for_new_banner
                )
                uploaded_banner_url = new_banner_url
            elif data.banner_url is not None:
                new_banner_url = data.banner_url
            update_data["banner_url"] = new_banner_url

            # Handle SEO update
            if data.seo is not None:
                existing_published_time = (blog.seo or {}).get("published_time")
                seo_data = cls._create_seo_data(
                    data.seo,
                    new_banner_url,
                    blog.link_post,
                    is_update=True,
                    existing_published_time=existing_published_time,
                )
                update_data["seo"] = seo_data
            else:
                # Repair legacy SEO URLs whenever an otherwise normal update is saved.
                seo_data = dict(blog.seo or {})
                seo_data["url"] = canonical_blog_url(blog.link_post)
                seo_data["banner_url"] = new_banner_url
                seo_data["modified_time"] = str(DateTime.now())
                update_data["seo"] = seo_data

            updated_blog = Blog.update(id, **update_data)
            if uploaded_banner_url and blog.banner_url:
                cls.delete_image_url(blog.banner_url)
            return updated_blog
        except HTTPException:
            cls.delete_image_url(uploaded_banner_url)
            raise
        except Exception:
            cls.delete_image_url(uploaded_banner_url)
            logger.exception("Blog update failed for %s", id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Chưa thể cập nhật bài viết. Vui lòng thử lại sau.",
            )

    @classmethod
    def delete_blog(cls, id: str) -> dict:
        """
        Deletes a blog with the provided id.
        Raises HTTPException if blog not found or deletion fails.
        """
        try:
            with cls.get_db_session() as session:
                blog = session.query(Blog).filter(
                    (Blog.id == id) & Blog.deleted_at.is_(None)
                ).first()

                if not blog:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Không tìm thấy bài viết",
                    )

                blog.deleted_at = DateTime.now()
                session.commit()
                return {"message": "Xóa bài viết thành công"}
        except HTTPException:
            raise
        except IntegrityError:
            session.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Đã xảy ra lỗi khi xóa bài viết",
            )

    @classmethod
    def get_blogs_for_admin(cls, state: Optional[str] = None, category: Optional[str] = None, page: int = 1, page_size: int = 20, search: Optional[str] = None) -> dict:
        query = select(
            Blog.id,
            Blog.tag,
            Blog.title,
            Blog.banner_url,
            Blog.link_post,
            Blog.created_at,
            Blog.modified_at,
            Blog.state,
            Blog.seo,
            Blog.category,
        )

        query = query.where(Blog.deleted_at.is_(None))
        if state is not None:
            query = query.filter(Blog.state == state)
        if category is not None:
            query = query.filter(Blog.category == category)
        # Match title or slug case-insensitively; autoescape keeps LIKE wildcards literal.
        if search and search.strip():
            term = search.strip()
            query = query.filter(or_(Blog.title.icontains(term, autoescape=True), Blog.link_post.icontains(term, autoescape=True)))

        query = query.order_by(desc(Blog.modified_at), desc(Blog.id))

        with cls.get_db_session() as session:
            total = session.execute(select(func.count()).select_from(query.subquery())).scalar_one()
            blogs = session.execute(query.offset((page - 1) * page_size).limit(page_size)).mappings().all()
            return {"items": list(blogs), "page": page, "pageSize": page_size, "total": total, "totalPages": (total + page_size - 1) // page_size}

    @classmethod
    def get_blog_for_client(
        cls,
        num_of_blogs: int,
        category: str,
        limit: int = 10,
        base_url: str = "blog/client/blogs",
    ) -> schemas.BlogForClient:
        """
        Load-more pagination using num_of_blogs from FE.
        Returns blogs and next request URL if more data exists.
        """
        with cls.get_db_session() as session:
            query = (
                select(
                    Blog.id,
                    Blog.tag,
                    Blog.title,
                    Blog.banner_url,
                    Blog.link_post,
                    Blog.created_at,
                    Blog.modified_at,
                    Blog.seo,
                    Blog.category,
                )
                .filter(Blog.state == schemas.BlogState.APPROVED)
                .filter(Blog.deleted_at.is_(None))
                .filter(web_visible_clause(Blog.id))
            )
            if category != "ALL":
                query = query.filter(Blog.category == category.upper())
            total_query = select(func.count()).select_from(query.subquery())
            total = session.execute(total_query).scalar()

            blog_query = (
                query.order_by(desc(Blog.created_at)).offset(num_of_blogs).limit(limit)
            )
            blogs = session.execute(blog_query).mappings().all()

            next_offset = num_of_blogs + len(blogs)
            has_next = next_offset < total

            next_params = ""
            if has_next:
                next_params += f"?num_of_blogs={next_offset}"
                next_req = f"{base_url}{next_params}"
            else:
                next_req = None

            return schemas.BlogForClient(
                blogs=list(blogs),
                next_req=next_req,
            )

    @classmethod
    def get_blog_by_id(cls, blog_id: str):
        try:
            with cls.get_db_session() as session:
                blog = session.query(Blog).filter(
                    Blog.id == blog_id, Blog.deleted_at.is_(None)
                ).first()
                if not blog:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Không tìm thấy bài viết",
                    )
                return {
                    "id": blog.id,
                    "tag": blog.tag,
                    "title": blog.title,
                    "banner_url": blog.banner_url,
                    "link_post": blog.link_post,
                    "content": blog.content,
                    "seo": blog.seo,
                    "category": blog.category,
                    "state": blog.state,
                    "created_at": blog.created_at,
                    "modified_at": blog.modified_at,
                    "related_blogs": [],
                }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lấy thông tin bài viết thất bại: {str(e)}",
            )

    @classmethod
    def get_blog_by_url(cls, link_post: str, limit: int):
        """
        Retrieves blog by blog_id.
        """
        try:
            with cls.get_db_session() as session:

                blog = session.query(Blog).filter(
                    (Blog.link_post == link_post)
                    & (Blog.state == schemas.BlogState.APPROVED)
                    & (Blog.deleted_at.is_(None))
                    & web_visible_clause(Blog.id)
                ).first()
                if not blog:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Không tìm thấy bài viết",
                    )
                related_blogs = cls.related_blog(current_blog=blog.id, limit=limit)
                return {
                    "id": blog.id,
                    "tag": blog.tag,
                    "title": blog.title,
                    "banner_url": blog.banner_url,
                    "link_post": blog.link_post,
                    "content": blog.content,
                    "category": blog.category,
                    "seo": blog.seo,
                    "state": blog.state,
                    "created_at": blog.created_at,
                    "modified_at": blog.modified_at,
                    "related_blogs": related_blogs,
                }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lấy thông tin bài viết thất bại: {str(e)}",
            )

    # Transliterate Vietnamese characters before normalizing the URL slug.
    @staticmethod
    def _create_url(title: str) -> str:
        return slugify(title, lowercase=True, separator="-")

    # Generate a complete editable Blog proposal without persistence.
    @classmethod
    async def ai_generate_blog_markdown_with_title(
        cls, title: str, category: str, language: PostLanguage = "vietnamese"
    ) -> dict:
        try:
            url = cls._create_url(title)
            # Build a review-only proposal; duplicate slugs are validated when saving.
            markdown_output = await GeminiAiService.generate_blog_markdown(
                title, language=language
            )
            seo_dict = (
                await GeminiAiService.generate_seo_keywords_and_description(
                    title, markdown_output.blog_content, language=language
                )
            )
            seo = schemas.SEODataSchema(
                title=title,
                description=seo_dict["description"],
                url=canonical_blog_url(url),
                keywords=seo_dict["keywords"],
                author=settings.AUTHOR,
            )
            tag = await GeminiAiService.generate_tag_base_on_title(
                title=title, language=language
            )
            return {
                "tag": tag,
                "title": title,
                "link_post": url,
                "category": category,
                "content": markdown_output.blog_content,
                "seo": seo.model_dump(),
            }
        except HTTPException as e:
            raise HTTPException(
                status_code=e.status_code,
                detail=f"Tạo bài viết thất bại: {str(e)}",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Tạo bài viết thất bại: {str(e)}",
            )

    @classmethod
    def is_duplicate_link_post(cls, link_post: str):
        """
        Validates if link_post is already in use.
        Returns True if link_post is available, False otherwise.
        If link_post is available, returns the blog_id of the blog that is using it.
        """
        blog = Blog.filter(Blog.link_post == link_post).filter(Blog.deleted_at.is_(None)).first()
        return blog is not None

    @classmethod
    def related_blog(cls, current_blog: str, limit: int):
        try:
            with cls.get_db_session() as session:
                blog = Blog.filter(Blog.id == current_blog).filter(Blog.deleted_at.is_(None)).first()
                if not blog:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Không tìm thấy bài viết",
                    )
                start_time = blog.created_at - timedelta(minutes=10)
                end_time = blog.created_at + timedelta(minutes=10)

                query = (
                    select(
                        Blog.id,
                        Blog.tag,
                        Blog.title,
                        Blog.seo,
                        Blog.banner_url,
                        Blog.link_post,
                        Blog.created_at,
                        Blog.modified_at,
                        Blog.category,
                    )
                    .filter(Blog.id != current_blog)
                    .filter(
                        (Blog.tag == blog.tag)
                        & (Blog.state == schemas.BlogState.APPROVED)
                        & web_visible_clause(Blog.id)
                    )
                    .filter(
                        (Blog.created_at >= start_time) & (Blog.created_at <= end_time)
                    )
                    .order_by(func.random())
                    .limit(limit)
                )
                return session.execute(query).mappings().all()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lấy bài viết liên quan thất bại: {str(e)}",
            )
