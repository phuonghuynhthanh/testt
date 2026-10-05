from math import gcd

from fastapi import (
    APIRouter,
    Depends,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi import HTTPException

from apps.auth.services import require_admin
from apps.core.storage import StorageService
from apps.core.rate_limit import limiter
from apps.media.schemas import AIImageGenerateRequest
from apps.media.services.cloudflare_ai import (
    AIImageError,
    CloudflareAIImageProvider,
)
from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.schemas import PexelsCandidate
from apps.linkedin_posts.services.pexels import PexelsService
from apps.linkedin_posts.routers import search_media
from config import settings


router = APIRouter(prefix="/media", tags=["Media"])


# Reuse the existing safe Pexels search contract for Blog banner selection.
@router.post("/pexels/search")
@limiter.limit(settings.RATE_LIMIT_AI)
async def search_pexels(
    request: Request,
    response: Response,
    keywords: list[str],
    _: str = Depends(require_admin),
):
    return await search_media(keywords, _)


# Upload a Blog image for an authenticated CMS request.
@router.post(
    "/image",
    summary="Upload an image",
    description="Upload an image and return url",
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(settings.RATE_LIMIT_WRITE)
def upload_image(
    request: Request,
    response: Response,
    image: UploadFile,
    link_blog: str = Query(
        default="", description="Link blog, e.g. /my-blog-link"
    ),
    _: str = Depends(require_admin),
):
    return StorageService.upload_image(image, folder=link_blog)


# Generate a validated, reviewable AI image without creating a Blog or post.
@router.post("/ai/generate", status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AI)
async def generate_ai_image(
    request: Request,
    response: Response,
    data: AIImageGenerateRequest,
    _: str = Depends(require_admin),
):
    provider = CloudflareAIImageProvider()
    try:
        image = await provider.generate(data)
        folder = (
            "blog-ai" if data.purpose.value == "BLOG_BANNER" else "linkedin"
        )
        object_key = StorageService.store_image_bytes(
            image.bytes, image.media_type, folder
        )
        file_name = (
            "ai-generated.png"
            if image.media_type == "image/png"
            else "ai-generated.jpg"
        )
        alt_text = (
            data.altText
            or (
                data.context or data.prompt or "Ảnh minh họa bài viết"
            ).splitlines()[0][:300]
        )
        divisor = gcd(image.width, image.height)
        return {
            "media": {
                "provider": "upload",
                "origin": "cloudflare-ai",
                "objectKey": object_key,
                "fileName": file_name,
                "altText": alt_text,
                "order": 1,
            },
            "width": image.width,
            "height": image.height,
            "aspectRatio": f"{image.width // divisor}:{image.height // divisor}",
            "size": data.size,
            "quality": "BALANCED",
        }
    except AIImageError as error:
        raise HTTPException(
            status_code=error.status_code, detail=error.as_dict()
        ) from error
    finally:
        await provider.close()


# Import only an explicitly selected and byte-validated Pexels banner into owned storage.
@router.post("/pexels/import", status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.RATE_LIMIT_AI)
async def import_pexels_banner(
    request: Request,
    response: Response,
    data: PexelsCandidate,
    _: str = Depends(require_admin),
):
    service = PexelsService(settings.PEXELS_API_KEY)
    try:
        image = await service.download(data)
        object_key = StorageService.store_image_bytes(
            image.bytes, image.media_type, "blog-pexels"
        )
        return {
            "provider": "upload",
            "origin": "pexels",
            "objectKey": object_key,
            "fileName": object_key.rsplit("/", 1)[-1],
            "altText": data.altText,
            "order": 1,
        }
    except LinkedInError as error:
        raise HTTPException(status_code=422, detail=error.as_dict()) from error
    finally:
        if service._owns_client:
            await service.client.aclose()
