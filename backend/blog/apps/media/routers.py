from fastapi import (
    APIRouter,
    Depends,
    Query,
    UploadFile,
    status,
)
from fastapi import HTTPException

from apps.auth.services import require_admin
from apps.core.storage import StorageService
from apps.media.schemas import AIImageGenerateRequest
from apps.media.services.cloudflare_ai import AIImageError, CloudflareAIImageProvider


router = APIRouter(prefix="/media", tags=["Media"])


# Upload a Blog image for an authenticated CMS request.
@router.post(
    "/image",
    summary="Upload an image",
    description="Upload an image and return url",
    status_code=status.HTTP_201_CREATED,
)
def upload_image(
    image: UploadFile,
    link_blog: str = Query(default="", description="Link blog, e.g. /my-blog-link"),
    _: str = Depends(require_admin),
):
    return StorageService.upload_image(image, folder=link_blog)


# Generate a validated, reviewable AI image without creating a Blog or post.
@router.post("/ai/generate", status_code=status.HTTP_201_CREATED)
async def generate_ai_image(
    data: AIImageGenerateRequest,
    _: str = Depends(require_admin),
):
    provider = CloudflareAIImageProvider()
    try:
        image = await provider.generate(data)
        folder = "blog-ai" if data.purpose.value == "BLOG_BANNER" else "linkedin"
        object_key = StorageService.store_image_bytes(image.bytes, image.media_type, folder)
        file_name = "ai-generated.png" if image.media_type == "image/png" else "ai-generated.jpg"
        alt_text = data.altText or data.context or data.prompt or "Ảnh tạo bằng AI"
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
            "aspectRatio": data.aspectRatio.value,
            "size": data.size,
            "quality": data.quality.value,
        }
    except AIImageError as error:
        raise HTTPException(status_code=error.status_code, detail=error.as_dict()) from error
    finally:
        await provider.close()
