import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status

from apps.auth.services import require_admin
from apps.blogs import schemas
from apps.blogs.models import Blog
from apps.blogs.services.blog import BlogServices
from apps.blogs.services.reference_search import ReferenceSearchService
from apps.openai.services.gemini_ai import GeminiAiService

router = APIRouter(prefix="/blog", tags=["Blogs"])


# Return approved Blog summaries for the public landing page.
@router.get(
    "/client/blogs",
    summary="Lấy danh sách bài viết cho client",
    description="Endpoint này lấy danh sách tất cả các bài viết khả dụng.",
    status_code=status.HTTP_200_OK,
    response_model=schemas.BlogForClient,
)
def get_blog_list_for_client(
    num_of_blogs: Optional[int] = Query(
        0, ge=0, description="Number of blogs already loaded on the client"
    ),
    category: Optional[str] = "ALL",
):
    return BlogServices.get_blog_for_client(
        num_of_blogs=num_of_blogs, category=category
    )


# Return the complete Blog list for the CMS administrator.
@router.get(
    "/admin/blogs",
    summary="Lấy danh sách bài viết cho admin",
    description="Endpoint này lấy danh sách bài viết phục vụ mục đích quản trị.",
    status_code=status.HTTP_200_OK,
)
def get_admin_blog_list(
    state: Optional[str] = None,
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    _: str = Depends(require_admin),
):
    return BlogServices.get_blogs_for_admin(state, category, page, pageSize)


# Return one Blog record for CMS editing.
@router.get(
    "/admin/{blog_id}",
    summary="Lấy thông tin bài viết theo ID",
    description="Endpoint này lấy chi tiết bài viết dựa theo mã định danh duy nhất.",
    status_code=status.HTTP_200_OK,
)
def get_blog_by_id(
    blog_id: str,
    _: str = Depends(require_admin),
):
    return BlogServices.get_blog_by_id(blog_id)


# Return an approved Blog article for public reading.
@router.get(
    "/link/{link_post}",
    summary="Lấy nội dung bài viết theo đường dẫn",
    description="Lấy nội dung bài viết theo đường dẫn link_post.",
    status_code=status.HTTP_200_OK,
)
def get_blog_content_by_link_post(link_post: str, limit: Optional[int] = 4):
    return BlogServices.get_blog_by_url(link_post=link_post, limit=limit)


# Create a Blog and its optional banner under administrator authorization.
@router.post(
    "",
    summary="Tạo bài viết mới",
    description="Endpoint này cho phép tạo bài viết mới với dữ liệu cung cấp.",
    status_code=status.HTTP_201_CREATED,
)
def create_blog(
    blog_data: str = Form(...),
    _: str = Depends(require_admin),
    image: UploadFile = File(None),
    action: schemas.BlogCreateAction = Form(schemas.BlogCreateAction.SAVE_PENDING),
):
    blog_data = schemas.BlogCreate(**json.loads(blog_data))
    return BlogServices.create_blog(blog_data=blog_data, image=image, action=action)


# Update an existing Blog under administrator authorization.
@router.put(
    "/{id}",
    summary="Cập nhật bài viết",
    description="Endpoint này cho phép cập nhật bài viết với dữ liệu cung cấp.",
    status_code=status.HTTP_200_OK,
)
def update_blog(
    id: str,
    blog_data: str = Form(...),
    _: str = Depends(require_admin),
    image: UploadFile = File(None),
):
    blog_data = schemas.BlogUpdate(**json.loads(blog_data))
    return BlogServices.update_blog(id=id, data=blog_data, image=image)


# Delete a Blog under administrator authorization.
@router.delete(
    "/{blog_id}",
    summary="Xóa bài viết",
    description="Endpoint này xóa một bài viết theo ID.",
    status_code=status.HTTP_200_OK,
)
def delete_blog(
    blog_id: str,
    _: str = Depends(require_admin),
):
    return BlogServices.delete_blog(blog_id)


# Restore a soft-deleted Blog without touching its preserved media.
@router.post("/{blog_id}/restore")
def restore_blog(blog_id: str, _: str = Depends(require_admin)):
    blog = Blog.get(blog_id)
    if not blog or not blog.deleted_at:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    return Blog.update(blog.id, deleted_at=None)


# Generate Blog markdown for the CMS administrator.
@router.post(
    "/ai/generate-draft",
    summary="Generate a review-only Blog draft",
    status_code=status.HTTP_200_OK,
)
# Generate a Blog proposal without writing any database or storage state.
async def generate_blog_draft(
    data: schemas.GenerateBlogData, _: str = Depends(require_admin)
):
    return await BlogServices.ai_generate_blog_markdown_with_title(
        data.title, data.category
    )


# Keep the legacy endpoint as a side-effect-free alias during client migration.
@router.post(
    "/ai-generate-markdown",
    summary="AI tạo nội dung bài viết theo tiêu đề",
    description="Endpoint này tạo bài viết bằng AI dựa trên tiêu đề.",
    status_code=status.HTTP_200_OK,
)
async def ai_generate_blog_markdown(
    data: schemas.GenerateBlogData,
    _: str = Depends(require_admin),
):
    return await BlogServices.ai_generate_blog_markdown_with_title(
        title=data.title, category=data.category
    )


# Generate Blog title ideas for the CMS administrator.
@router.get(
    "/openai/ai-generate-list-title",
    summary="AI tạo danh sách tiêu đề",
    description="Endpoint này tạo danh sách gợi ý tiêu đề bằng AI.",
    status_code=status.HTTP_200_OK,
    response_model=List[str],
)
async def ai_generate_blog_list_title(
    keyword: str,
    quantity: int = Query(1, ge=5, le=10),
    language: str = Query("vietnamese", enum=["vietnamese", "english"]),
    _: str = Depends(require_admin),
):
    return await GeminiAiService.generate_list_title(keyword, quantity, language)


# Check whether a Blog slug is already used.
@router.get(
    "/is-duplicate-link-post",
    summary="Kiểm tra trùng lặp đường dẫn bài viết",
    description="Endpoint này kiểm tra xem đường dẫn bài viết đã được sử dụng hay chưa.",
    status_code=status.HTTP_200_OK,
)
def is_duplicate_link_post(
    link_post: str,
    _: str = Depends(require_admin),
):
    return BlogServices.is_duplicate_link_post(link_post)


# Search and classify reference links for the CMS administrator.
@router.post(
    "/search-references",
    summary="Search reference links (SERP) and classify",
    description=(
        "Search reference links from SERP by keyword and classify them into "
        "NORMAL / ADS / SPAM."
    ),
    status_code=status.HTTP_200_OK,
    response_model=List[schemas.LinkReference],
)
async def search_references(
    payload: schemas.SearchReferencesRequest,
    _: str = Depends(require_admin),
):
    """
    Tìm kiếm link tham khảo từ keyword và phân loại.
    """
    return await ReferenceSearchService.search_references(payload)


# Classify supplied reference links for the CMS administrator.
@router.post(
    "/classify-links",
    summary="Classify existing links",
    description="Classify a given list of links into organic / ad / spam / duplicate.",
    status_code=status.HTTP_200_OK,
    response_model=schemas.ClassifyLinksResponse,
)
async def classify_links(
    payload: schemas.ClassifyLinksRequest,
    _: str = Depends(require_admin),
):
    """
    Phân loại danh sách link đã có.
    """
    return await ReferenceSearchService.classify_links(payload)


# Fetch external article content for the CMS administrator.
@router.post(
    "/fetch-content",
    summary="Fetch and extract content from URL",
    description=(
        "Fetch HTML content from a URL and extract the main article content "
        "using trafilatura. Returns title, content (HTML/plain text), author, "
        "published date, and other metadata."
    ),
    status_code=status.HTTP_200_OK,
    response_model=schemas.FetchContentResponse,
)
async def fetch_content(
    payload: schemas.FetchContentRequest,
    _: str = Depends(require_admin),
):
    """
    Fetch và extract nội dung từ một URL.
    """
    return await ReferenceSearchService.fetch_content_from_url(payload)
