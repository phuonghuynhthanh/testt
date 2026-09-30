from contextlib import contextmanager
from datetime import timedelta
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status
from psycopg2 import IntegrityError
from slugify import slugify
from sqlalchemy import desc, func, select

from apps.blogs import schemas
from apps.blogs.models import Blog
from apps.core.storage import StorageService
from apps.core.date_time import DateTime
from apps.core.publication_visibility import web_visible_clause
from apps.core.urls import canonical_blog_url
from apps.openai.services.gemini_ai import GeminiAiService
from config import settings
from config.database import DatabaseManager


class BlogServices:
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

    @staticmethod
    def _create_seo_data(
        seo_input: schemas.SEODataSchema,
        banner_url: Optional[str],
        is_update: bool = False,
        existing_published_time: str = None,
    ) -> dict:
        """Create SEO data dictionary"""
        current_time = str(DateTime.now())
        return {
            "title": seo_input.title,
            "description": seo_input.description,
            "banner_url": banner_url,
            "url": seo_input.url,
            "keywords": seo_input.keywords,
            "author": seo_input.author,
            "published_time": existing_published_time if is_update else current_time,
            "modified_time": current_time,
        }

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
            ex_link = Blog.filter(Blog.link_post == blog_data.link_post).first()
            if ex_link:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Bài viết với liên kết '{blog_data.link_post}' đã tồn tại",
                )
            if image:
                banner_url = StorageService.upload_image(
                    image, folder=blog_data.link_post
                )
                uploaded_banner_url = banner_url

            seo_data = cls._create_seo_data(blog_data.seo, banner_url)
            blog = Blog.create(
                tag=blog_data.tag,
                title=blog_data.title,
                banner_url=banner_url,
                link_post=blog_data.link_post,
                content=blog_data.content,
                state=(
                    schemas.BlogState.APPROVED
                    if action is schemas.BlogCreateAction.PUBLISH_NOW
                    else schemas.BlogState.PENDING
                ),
                category=blog_data.category,
                seo=seo_data,
            )
        except IntegrityError:
            cls.delete_image_url(uploaded_banner_url)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bài viết đã tồn tại",
            )
        except HTTPException:
            cls.delete_image_url(uploaded_banner_url)
            raise
        except Exception:
            cls.delete_image_url(uploaded_banner_url)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Tạo bài viết thất bại",
            )

        return blog

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
                blog = session.query(Blog).filter(Blog.id == id).first()
                ex_link = (
                    session.query(Blog.link_post)
                    .filter((Blog.link_post == data.link_post) & (Blog.id != id))
                    .first()
                )
                if ex_link:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Bài viết với liên kết '{data.link_post}' đã tồn tại",
                    )

            if not blog:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy bài viết",
                )

            update_data = {"modified_at": DateTime.now()}

            field_mappings = {
                "title": data.title,
                "link_post": data.link_post,
                "content": data.content,
                "tag": data.tag,
                "state": data.state,
                "category": data.category,
            }

            for field_name, field_value in field_mappings.items():
                if field_value is not None:
                    update_data[field_name] = field_value
            new_banner_url = blog.banner_url
            if image is not None:
                folder_for_new_banner = data.link_post or blog.link_post
                new_banner_url = StorageService.upload_image(
                    image, folder=folder_for_new_banner
                )
                uploaded_banner_url = new_banner_url
            elif (data.banner_url is not None) & (data.banner_url != ""):
                new_banner_url = data.banner_url
            update_data["banner_url"] = new_banner_url

            # Handle SEO update
            if data.seo is not None:
                existing_published_time = blog.seo["published_time"]
                seo_data = cls._create_seo_data(
                    data.seo,
                    new_banner_url,
                    is_update=True,
                    existing_published_time=existing_published_time,
                )
                update_data["seo"] = seo_data

            updated_blog = Blog.update(id, **update_data)
            if uploaded_banner_url and blog.banner_url:
                cls.delete_image_url(blog.banner_url)
            return updated_blog
        except HTTPException:
            cls.delete_image_url(uploaded_banner_url)
            raise
        except Exception as e:
            cls.delete_image_url(uploaded_banner_url)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Cập nhật bài viết thất bại: {str(e)}",
            )

    @classmethod
    def delete_blog(cls, id: str) -> dict:
        """
        Deletes a blog with the provided id.
        Raises HTTPException if blog not found or deletion fails.
        """
        try:
            with cls.get_db_session() as session:
                blog = session.query(Blog).filter(Blog.id == id).first()

                if not blog:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Không tìm thấy bài viết",
                    )

                banner_url = blog.banner_url
                link_post = blog.link_post
                session.delete(blog)
                session.commit()
                cls.delete_image_url(banner_url)
                # StorageService logs cleanup errors; the committed delete stays successful.
                try:
                    StorageService.delete_key(link_post)
                except Exception:
                    pass
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
    def get_blogs_for_admin(
        cls, state: Optional[str] = None
    ) -> List[schemas.ListBlogAdmin]:
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

        if state is not None:
            query = query.filter(Blog.state == state)

        query = query.order_by(desc(Blog.modified_at))

        with cls.get_db_session() as session:
            blogs = session.execute(query).mappings().all()
            return list(blogs) if blogs else []

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
                blog = Blog.filter(Blog.id == blog_id).first()
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

                blog = Blog.filter(
                    (Blog.link_post == link_post)
                    & (Blog.state == schemas.BlogState.APPROVED)
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
        cls, title: str, category: str
    ) -> dict:
        try:
            url = cls._create_url(title)
            # Build a review-only proposal; duplicate slugs are validated when saving.
            markdown_output = await GeminiAiService.generate_blog_markdown(title)
            seo_dict = await GeminiAiService.generate_seo_keywords_and_description(
                title, markdown_output.blog_content
            )
            seo = schemas.SEODataSchema(
                title=title,
                description=seo_dict["description"],
                url=canonical_blog_url(url),
                keywords=seo_dict["keywords"],
                author=settings.AUTHOR,
            )
            tag = await GeminiAiService.generate_tag_base_on_title(title=title)
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
        blog = Blog.filter(Blog.link_post == link_post).first()
        return blog is not None

    @classmethod
    def related_blog(cls, current_blog: str, limit: int):
        try:
            with cls.get_db_session() as session:
                blog = Blog.filter(Blog.id == current_blog).first()
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
