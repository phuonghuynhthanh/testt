from fastapi import APIRouter, Depends, status

from apps.openai import schemas
from apps.openai.services.gemini_ai import GeminiAiService
from apps.auth.services import require_admin

router = APIRouter(prefix="/openai", tags=["OpenAI"])


# Generate SEO keywords for an authenticated CMS request.
@router.post(
    "/seo-keywords",
    summary="Tạo từ khóa SEO",
    description="Endpoint này tạo từ khóa SEO dựa trên tiêu đề và nội dung bài viết.",
    status_code=status.HTTP_200_OK,
)
async def generate_seo_keywords(
    data: schemas.GenerateSEOKeywordsIn,
    _: str = Depends(require_admin),
):
    return await GeminiAiService.generate_seo_keywords(
        data.blog_title, data.blog_content
    )


# Generate an SEO description for an authenticated CMS request.
@router.post(
    "/seo-description",
    summary="Tạo mô tả SEO",
    description="Endpoint này tạo mô tả SEO dựa trên tiêu đề và nội dung bài viết.",
    status_code=status.HTTP_200_OK,
)
async def generate_seo_description(
    data: schemas.GenerateSEOKeywordsIn,
    _: str = Depends(require_admin),
):
    return await GeminiAiService.generate_seo_description(
        data.blog_title, data.blog_content
    )
