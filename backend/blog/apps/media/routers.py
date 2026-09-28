from fastapi import (
    APIRouter,
    Query,
    UploadFile,
    status,
)

from apps.core.storage import StorageService


router = APIRouter(prefix="/media", tags=["Media"])

@router.post(
    "/image",
    summary="Upload an image",
    description="Upload an image and return url",
    status_code=status.HTTP_201_CREATED,
)
def upload_image(
    image: UploadFile,
    link_blog: str = Query(default="", description="Link blog, e.g. /my-blog-link"),
):
    return StorageService.upload_image(image, folder=link_blog)