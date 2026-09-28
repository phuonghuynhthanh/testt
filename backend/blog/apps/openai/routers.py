from fastapi import APIRouter, Depends, status

from apps.openai import schemas
from apps.openai.services.gemini_ai import GeminiAiService
from apps.accounts.services.authenticate import AccountService

router = APIRouter(prefix="/openai", tags=["OpenAI"])


@router.post(
    "/seo-keywords",
    summary="Generate SEO keywords",
    description="This endpoint generates SEO keywords based on the title and content of a blog.",
    status_code=status.HTTP_200_OK,
)
async def generate_seo_keywords(
    data: schemas.GenerateSEOKeywordsIn,
    current_user: str = Depends(AccountService.current_blog_user),
):
    return await GeminiAiService.generate_seo_keywords(
        data.blog_title, data.blog_content
    )


@router.post(
    "/seo-description",
    summary="Generate SEO description",
    description="This endpoint generates SEO description based on the title and content of a blog.",
    status_code=status.HTTP_200_OK,
)
async def generate_seo_description(
    data: schemas.GenerateSEOKeywordsIn,
    current_user: str = Depends(AccountService.current_blog_user),
):
    return await GeminiAiService.generate_seo_description(
        data.blog_title, data.blog_content
    )