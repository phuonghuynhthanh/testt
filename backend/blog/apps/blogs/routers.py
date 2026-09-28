import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status

from apps.accounts.schemas import UserSchema
from apps.accounts.services.authenticate import AccountService
from apps.blogs import schemas
from apps.blogs.services.blog import BlogServices
from apps.blogs.services.reference_search import ReferenceSearchService
from apps.openai.services.gemini_ai import GeminiAiService

router = APIRouter(prefix="/blog", tags=["Blogs"])


@router.get(
    "/client/blogs",
    summary="Get list of blogs for client",
    description="This endpoint retrieves a list of all available blogs.",
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


@router.get(
    "/admin/blogs",
    summary="Get list of blogs for admin",
    description="This endpoint retrieves a list of all available blogs for administrative purposes.",
    status_code=status.HTTP_200_OK,
    response_model=List[schemas.ListBlogAdmin],
)
def get_admin_blog_list(
    state: Optional[str] = None,
    current_user: str = Depends(AccountService.current_blog_user),
):
    return BlogServices.get_blogs_for_admin(state)


@router.get(
    "/admin/{blog_id}",
    summary="Retrieve a blog by its ID",
    description="This endpoint fetches a specific blog based on its unique identifier.",
    status_code=status.HTTP_200_OK,
)
def get_blog_by_id(
    blog_id: str,
    current_user: str = Depends(AccountService.current_blog_user),
):
    return BlogServices.get_blog_by_id(blog_id)


@router.get(
    "/link/{link_post}",
    summary="Get blog content by link post",
    description="Retrieves the content of a specific blog by its link post.",
    status_code=status.HTTP_200_OK,
)
def get_blog_content_by_link_post(link_post: str, limit: Optional[int] = 4):
    return BlogServices.get_blog_by_url(link_post=link_post, limit=limit)


@router.post(
    "",
    summary="Create a new blog",
    description="This endpoint allows you to create a new blog with the provided data.",
    status_code=status.HTTP_201_CREATED,
)
def create_blog(
    blog_data: str = Form(...),
    current_user: UserSchema = Depends(AccountService.current_blog_user),
    image: UploadFile = File(...),
):
    blog_data = schemas.BlogCreate(**json.loads(blog_data))
    return BlogServices.create_blog(blog_data=blog_data, image=image)


@router.put(
    "/{id}",
    summary="Update a blog",
    description="This endpoint allows you to update a blog with the provided data.",
    status_code=status.HTTP_200_OK,
)
def update_blog(
    id: str,
    blog_data: str = Form(...),
    current_user: str = Depends(AccountService.current_blog_user),
    image: UploadFile = File(None),
):
    blog_data = schemas.BlogUpdate(**json.loads(blog_data))
    return BlogServices.update_blog(id=id, data=blog_data, image=image)


@router.delete(
    "/{blog_id}",
    summary="Delete a blog",
    description="This endpoint deletes a blog by its ID.",
    status_code=status.HTTP_200_OK,
)
def delete_blog(
    blog_id: str,
    current_user: str = Depends(AccountService.current_blog_user),
):
    return BlogServices.delete_blog(blog_id)


@router.post(
    "/ai-generate-markdown",
    summary="AI generate blog with title",
    description="This endpoint generates a blog with a title using AI.",
    status_code=status.HTTP_200_OK,
)
async def ai_generate_blog_markdown(
    data: schemas.GenerateBlogData,
    current_user: UserSchema = Depends(AccountService.current_blog_user),
):
    return await BlogServices.ai_generate_blog_markdown_with_title(
        title=data.title, category=data.category
    )


@router.get(
    "/openai/ai-generate-list-title",
    summary="AI generate list title",
    description="This endpoint generates a list title using AI.",
    status_code=status.HTTP_200_OK,
    response_model=List[str],
)
async def ai_generate_blog_list_title(
    keyword: str,
    quantity: int = Query(1, ge=5, le=10),
    language: str = Query("vietnamese", enum=["vietnamese", "english"]),
    current_user: UserSchema = Depends(AccountService.current_blog_user),
):
    return await GeminiAiService.generate_list_title(keyword, quantity, language)


@router.get(
    "/is-duplicate-link-post",
    summary="Check if link post is duplicate",
    description="This endpoint checks if a link post is already in use by another blog.",
    status_code=status.HTTP_200_OK,
)
def is_duplicate_link_post(
    link_post: str,
    current_user: str = Depends(AccountService.current_blog_user),
):
    return BlogServices.is_duplicate_link_post(link_post)


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
    current_user: UserSchema = Depends(AccountService.current_blog_user),
):
    """
    Tìm kiếm link tham khảo từ keyword và phân loại.
    """
    return await ReferenceSearchService.search_references(payload)


@router.post(
    "/classify-links",
    summary="Classify existing links",
    description="Classify a given list of links into organic / ad / spam / duplicate.",
    status_code=status.HTTP_200_OK,
    response_model=schemas.ClassifyLinksResponse,
)
async def classify_links(
    payload: schemas.ClassifyLinksRequest,
    current_user: UserSchema = Depends(AccountService.current_blog_user),
):
    """
    Phân loại danh sách link đã có.
    """
    return await ReferenceSearchService.classify_links(payload)


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
    current_user: UserSchema = Depends(AccountService.current_blog_user),
):
    """
    Fetch và extract nội dung từ một URL.
    """
    return await ReferenceSearchService.fetch_content_from_url(payload)
