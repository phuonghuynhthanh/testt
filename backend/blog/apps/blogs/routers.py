import csv
import io
import json
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from apps.auth.services import require_admin
from apps.core.rate_limit import limiter
from config import settings
from apps.blogs import schemas
from apps.blogs.models import Blog
from apps.blogs.services.blog import BlogServices
from apps.blogs.services.reference_search import ReferenceSearchService
from apps.openai.services.gemini_ai import GeminiAiService

router = APIRouter(prefix="/blog", tags=["Blogs"])


# Validate multipart JSON through the same friendly boundary as regular request bodies.
def _parse_blog_payload(value: str, schema: type[schemas.BlogCreate] | type[schemas.BlogUpdate]):
    try:
        return schema.model_validate(json.loads(value))
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=422, detail="Dữ liệu bài viết không hợp lệ. Vui lòng kiểm tra và thử lại.") from error
    except ValidationError as error:
        raise RequestValidationError([
            {**item, "loc": ("body", "blog_data", *item["loc"])} for item in error.errors()
        ]) from error


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
    limit: int = Query(10, ge=1, le=24),
):
    return BlogServices.get_blog_for_client(
        num_of_blogs=num_of_blogs, category=category, limit=limit
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
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    _: str = Depends(require_admin),
    sort: Literal["title", "category", "state", "modified"] = "modified",
    dir: Literal["asc", "desc"] = "desc",
    include: Literal["linkedin"] | None = None,
):
    return BlogServices.get_blogs_for_admin(state, category, page, pageSize, search, sort, dir, include)


# Count filtered Blogs regardless of the selected state tab.
@router.get("/admin/counts")
def get_blog_counts(
    category: str | None = None,
    search: str | None = Query(None, max_length=100),
    _: str = Depends(require_admin),
):
    return BlogServices.get_admin_counts(category, search)


# Return all-time totals and two calendar weeks of Vietnam daily activity.
@router.get("/admin/stats")
def get_blog_stats(_: str = Depends(require_admin)):
    return BlogServices.get_admin_stats()


# Stream a bounded UTF-8 CSV with the same filters and ordering as the admin list.
@router.get("/admin/export.csv")
def export_blogs(
    state: str | None = None,
    category: str | None = None,
    search: str | None = Query(None, max_length=100),
    sort: Literal["title", "category", "state", "modified"] = "modified",
    dir: Literal["asc", "desc"] = "desc",
    _: str = Depends(require_admin),
):
    result = BlogServices.get_blogs_for_admin(state, category, 1, 5000, search, sort, dir)
    items = result["items"]

    # Emit a BOM for Excel and neutralize spreadsheet formulas in text fields.
    def csv_rows():
        buffer = io.StringIO(newline="")
        writer = csv.writer(buffer)
        yield "\ufeff"
        writer.writerow(
            ["Tiêu đề", "Slug", "Danh mục", "Trạng thái", "Cập nhật"]
        )
        yield buffer.getvalue()
        for item in items:
            buffer.seek(0)
            buffer.truncate(0)
            values = [
                str(item[key] or "")
                for key in [
                    "title",
                    "link_post",
                    "category",
                    "state",
                    "modified_at",
                ]
            ]
            writer.writerow(
                [
                    (
                        "'" + value
                        if value.lstrip().startswith(("=", "+", "-", "@"))
                        else value
                    )
                    for value in values
                ]
            )
            yield buffer.getvalue()

    return StreamingResponse(
        csv_rows(),
        media_type="text/csv",
        # Tell clients when the 5000-row export cap hid matching Blogs.
        headers={
            "Content-Disposition": 'attachment; filename="blogs.csv"',
            "X-Truncated": "true" if result["total"] > len(items) else "false",
        },
    )


# Apply a bounded group of state changes, including explicit undo timestamps.
@router.post("/admin/bulk-state")
@limiter.limit(settings.RATE_LIMIT_WRITE)
def bulk_blog_state(
    request: Request,
    response: Response,
    data: schemas.BulkStateRequest,
    _: str = Depends(require_admin),
):
    return BlogServices.bulk_state(data)


# Soft-delete a bounded group of active Blogs without deleting media.
@router.post("/admin/bulk-delete")
@limiter.limit(settings.RATE_LIMIT_WRITE)
def bulk_delete_blogs(
    request: Request,
    response: Response,
    data: schemas.BulkIdsRequest,
    _: str = Depends(require_admin),
):
    return BlogServices.bulk_delete_restore(data)


# Undo a soft-delete in one transaction while preserving media and timestamps.
@router.post("/admin/bulk-restore")
@limiter.limit(settings.RATE_LIMIT_WRITE)
def bulk_restore_blogs(
    request: Request,
    response: Response,
    data: schemas.BulkIdsRequest,
    _: str = Depends(require_admin),
):
    return BlogServices.bulk_delete_restore(data, restore=True)


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
def get_blog_content_by_link_post(link_post: str, limit: int = Query(4, ge=1, le=12), related: Literal["category"] | None = None):
    return BlogServices.get_blog_by_url(link_post=link_post, limit=limit, related=related)


# Change one Blog state through JSON while keeping multipart edits available.
@router.patch("/{id}/state")
@limiter.limit(settings.RATE_LIMIT_WRITE)
def patch_blog_state(
    request: Request,
    response: Response,
    id: str,
    data: schemas.BlogStateUpdate,
    _: str = Depends(require_admin),
):
    result = BlogServices.bulk_state(
        schemas.BulkStateRequest(
            items=[schemas.BulkStateItem(id=id, **data.model_dump())]
        )
    )
    if result["notFound"]:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết")
    return result["items"][0]


# Create a Blog and its optional banner under administrator authorization.
@router.post(
    "",
    summary="Tạo bài viết mới",
    description="Endpoint này cho phép tạo bài viết mới với dữ liệu cung cấp.",
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(settings.RATE_LIMIT_WRITE)
def create_blog(
    request: Request,
    response: Response,
    blog_data: str = Form(...),
    _: str = Depends(require_admin),
    image: UploadFile = File(None),
    action: schemas.BlogCreateAction = Form(schemas.BlogCreateAction.SAVE_PENDING),
):
    blog_data = _parse_blog_payload(blog_data, schemas.BlogCreate)
    return BlogServices.create_blog(blog_data=blog_data, image=image, action=action)


# Update an existing Blog under administrator authorization.
@router.put(
    "/{id}",
    summary="Cập nhật bài viết",
    description="Endpoint này cho phép cập nhật bài viết với dữ liệu cung cấp.",
    status_code=status.HTTP_200_OK,
)
@limiter.limit(settings.RATE_LIMIT_WRITE)
def update_blog(
    request: Request,
    response: Response,
    id: str,
    blog_data: str = Form(...),
    _: str = Depends(require_admin),
    image: UploadFile = File(None),
):
    blog_data = _parse_blog_payload(blog_data, schemas.BlogUpdate)
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
@limiter.limit(settings.RATE_LIMIT_AI)
async def generate_blog_draft(
    request: Request,
    response: Response,
    data: schemas.GenerateBlogData, _: str = Depends(require_admin)
):
    return await BlogServices.ai_generate_blog_markdown_with_title(
        data.title, data.category, language=data.language
    )


# Keep the legacy endpoint as a side-effect-free alias during client migration.
@router.post(
    "/ai-generate-markdown",
    summary="AI tạo nội dung bài viết theo tiêu đề",
    description="Endpoint này tạo bài viết bằng AI dựa trên tiêu đề.",
    status_code=status.HTTP_200_OK,
)
@limiter.limit(settings.RATE_LIMIT_AI)
async def ai_generate_blog_markdown(
    request: Request,
    response: Response,
    data: schemas.GenerateBlogData,
    _: str = Depends(require_admin),
):
    return await BlogServices.ai_generate_blog_markdown_with_title(
        title=data.title, category=data.category, language=data.language
    )


# Generate Blog title ideas for the CMS administrator.
@router.get(
    "/openai/ai-generate-list-title",
    summary="AI tạo danh sách tiêu đề",
    description="Endpoint này tạo danh sách gợi ý tiêu đề bằng AI.",
    status_code=status.HTTP_200_OK,
    response_model=List[str],
)
@limiter.limit(settings.RATE_LIMIT_AI)
async def ai_generate_blog_list_title(
    request: Request,
    response: Response,
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
@limiter.limit(settings.RATE_LIMIT_AI)
async def search_references(
    request: Request,
    response: Response,
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
@limiter.limit(settings.RATE_LIMIT_AI)
async def classify_links(
    request: Request,
    response: Response,
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
