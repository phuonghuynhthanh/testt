"""Admin-only provider diagnostics and safe Pexels search."""

import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, UploadFile, status

from apps.auth.services import require_admin
from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.services.organization import OrganizationVerifier
from apps.linkedin_posts.services.pexels import PexelsService
from apps.linkedin_posts.schemas import (
    IndependentDraftRequest,
    LinkedInPreviewRequest,
    LinkedInPostCreate,
    LinkedInPostUpdate,
    TopicProposalRequest,
    UploadedMedia,
)
from apps.linkedin_posts.services.history import LinkedInHistoryService
from apps.linkedin_posts.services.image import validate_image_bytes
from apps.linkedin_posts.services.posts import LinkedInPostService
from apps.core.storage import StorageService
from apps.core.rate_limit import limiter
from config import settings

router = APIRouter(prefix="/linkedin", tags=["LinkedIn"])
TOPIC_PROPOSAL_ATTEMPTS = 3


# Normalize topics for deterministic recent-history and in-batch duplicate checks.
def _normalized_topic(value: str) -> str:
    return " ".join(value.strip().casefold().split())


# Compose unsaved LinkedIn copy without database writes or external requests.
@router.post("/preview")
def preview_post(
    data: LinkedInPreviewRequest, _: str = Depends(require_admin)
):
    return LinkedInPostService.preview(data)


# Generate a standalone preview without persisting or posting it.
@router.post("/ai/generate-draft")
@limiter.limit(settings.RATE_LIMIT_AI)
async def generate_draft(
    request: Request,
    response: Response,
    data: IndependentDraftRequest, _: str = Depends(require_admin)
):
    try:
        return await LinkedInPostService.generate_draft(data)
    except LinkedInError as error:
        raise _http_error(error) from error


# Return bounded standalone LinkedIn records without calling the provider.
@router.get("/posts")
def list_posts(page: int = Query(1, ge=1), pageSize: int = Query(20, ge=1, le=100), status: str | None = None, sourceType: str | None = None, _: str = Depends(require_admin)):
    return LinkedInPostService.list(page, pageSize, status, sourceType)


# Return one standalone LinkedIn record.
@router.get("/posts/{post_id}")
def get_post(post_id: str, _: str = Depends(require_admin)):
    return LinkedInPostService.serialize(LinkedInPostService.get(post_id))


# Save reviewed content or explicitly persist and publish it in one request.
@router.post("/posts")
@limiter.limit(settings.RATE_LIMIT_AI)
async def create_post(request: Request, response: Response, data: LinkedInPostCreate, _: str = Depends(require_admin)):
    return await LinkedInPostService.create(data)


# Update local reviewed content without publishing it.
@router.put("/posts/{post_id}")
def update_post(
    post_id: str, data: LinkedInPostUpdate, _: str = Depends(require_admin)
):
    return LinkedInPostService.update(post_id, data)


# Delete unpublished local content only.
@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: str, _: str = Depends(require_admin)):
    LinkedInPostService.delete(post_id)


# Restore a soft-deleted local record without altering the Company Page.
@router.post("/posts/{post_id}/restore")
def restore_post(post_id: str, _: str = Depends(require_admin)):
    return LinkedInPostService.restore(post_id)


# Return exactly the provider-first history passed into AI generation.
@router.get("/history/recent")
async def recent_history(limit: int = Query(5, ge=1, le=50), _: str = Depends(require_admin)):
    try:
        return {"source": "linkedin", "items": [item.model_dump(mode="json") for item in await LinkedInHistoryService().recent(limit)]}
    except LinkedInError as error:
        raise _http_error(error) from error


# Explicitly refresh the read-only provider view; no deletion state is inferred.
@router.post("/history/sync")
async def sync_history(_: str = Depends(require_admin)):
    try:
        return {"source": "linkedin", "items": [item.model_dump(mode="json") for item in await LinkedInHistoryService().recent(50)]}
    except LinkedInError as error:
        raise _http_error(error) from error


# Propose fresh topics from real recent Company Page content without persistence.
@router.post("/ai/propose-topics")
@limiter.limit(settings.RATE_LIMIT_AI)
async def propose_topics(request: Request, response: Response, data: TopicProposalRequest, _: str = Depends(require_admin)):
    try:
        history = await LinkedInHistoryService().recent(data.recentLimit)
    except LinkedInError as error:
        raise _http_error(error) from error
    # Keep this deliberately small: Gemini receives the source guideline plus live history.
    from apps.core.language import language_instruction
    from apps.linkedin_posts.services.gemini import GeminiLinkedInProvider
    provider = GeminiLinkedInProvider(settings.GEMINI_API_KEY or "", settings.GEMINI_MODEL)
    try:
        seen = {_normalized_topic(item.topic) for item in history if item.topic}
        topics = []
        system_prompt = (Path(__file__).parent / "prompts" / "system.md").read_text(encoding="utf-8")
        # Retry only structured-output duplication and stop after the fixed attempt budget.
        for _attempt in range(TOPIC_PROPOSAL_ATTEMPTS):
            remaining = data.count - len(topics)
            audience = data.targetAudience or "Infer the most suitable audience from topic, VietQuant guidance, and recent feed history."
            prompt = (
                language_instruction(data.language)
                + "\n"
                + "Đề xuất các chủ đề LinkedIn mới. "
                "Trả JSON object {topics: string[]}. "
                "Không lặp topic gần đây hoặc trong batch.\n"
                + json.dumps(
                    {
                        "count": remaining,
                        "targetAudience": audience,
                        "guideline": data.guideline,
                        "recentPosts": [
                            item.model_dump(mode="json") for item in history
                        ],
                        "alreadySelected": topics,
                    },
                    ensure_ascii=False,
                )
            )
            payload = await provider._request(system_prompt, prompt, {"type": "object", "properties": {"topics": {"type": "array", "minItems": remaining, "maxItems": remaining, "items": {"type": "string"}}}, "required": ["topics"]}, "propose topics")
            values = payload.get("topics", []) if isinstance(payload, dict) else []
            for value in values if isinstance(values, list) else []:
                topic = " ".join(str(value).strip().split())
                normalized = _normalized_topic(topic)
                if topic and normalized not in seen:
                    seen.add(normalized)
                    topics.append(topic)
                if len(topics) == data.count:
                    break
            if len(topics) == data.count:
                break
        if len(topics) < data.count:
            raise HTTPException(status_code=422, detail="AI did not return enough distinct fresh topics")
        return {"topics": topics, "historySource": "linkedin"}
    except LinkedInError as error:
        raise _http_error(error) from error
    finally:
        if provider._owns_client:
            await provider.client.aclose()


# Publish an existing reviewed post without generating or selecting new media.
@router.post("/posts/{post_id}/publish")
@limiter.limit(settings.RATE_LIMIT_AI)
async def publish_post(request: Request, response: Response, post_id: str, _: str = Depends(require_admin)):
    return await LinkedInPostService.publish(post_id)


# Retry only a safely failed provider operation.
@router.post("/posts/{post_id}/retry")
@limiter.limit(settings.RATE_LIMIT_AI)
async def retry_post(request: Request, response: Response, post_id: str, _: str = Depends(require_admin)):
    return await LinkedInPostService.publish(post_id, retry=True)


# Suggest reviewable media for a saved post without replacing selected assets.
@router.post("/posts/{post_id}/media/suggest")
async def suggest_post_media(
    post_id: str, keywords: list[str] | None = None, _: str = Depends(require_admin)
):
    return await LinkedInPostService.suggest_media(post_id, keywords)


# Construct the configured organization verifier without exposing configuration.
def _verifier() -> OrganizationVerifier:
    return OrganizationVerifier(
        settings.LINKEDIN_ACCESS_TOKEN,
        settings.LINKEDIN_CLIENT_ID,
        settings.LINKEDIN_CLIENT_SECRET,
        settings.LINKEDIN_ORGANIZATION_URN,
        settings.LINKEDIN_VERSION,
    )


# Convert a provider exception into a credential-safe operational HTTP response.
def _http_error(error: LinkedInError) -> HTTPException:
    code = (
        status.HTTP_429_TOO_MANY_REQUESTS
        if error.code == "rate_limited"
        else (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if error.code in {"linkedin_unavailable", "network_error", "provider_history_unavailable"}
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
    )
    return HTTPException(status_code=code, detail=error.as_dict())


# Verify Company Page access in a read-only, administrator-protected route.
@router.get("/organization/verify")
async def verify_organization(_: str = Depends(require_admin)):
    verifier = _verifier()
    try:
        return (await verifier.verify()).model_dump()
    except LinkedInError as error:
        raise _http_error(error) from error
    finally:
        await verifier.linkedin.close()


# Search Pexels without returning its API key or fetching arbitrary client URLs.
@router.post("/media/search")
async def search_media(keywords: list[str], _: str = Depends(require_admin)):
    service = PexelsService(settings.PEXELS_API_KEY)
    try:
        return {"items": [item.model_dump() for item in await service.search(keywords)]}
    except LinkedInError as error:
        raise _http_error(error) from error
    finally:
        if service._owns_client:
            await service.client.aclose()


# Store one administrator-selected image as safe LinkedIn media metadata.
@router.post(
    "/media/upload",
    status_code=status.HTTP_201_CREATED,
    response_model=UploadedMedia,
)
@limiter.limit(settings.RATE_LIMIT_WRITE)
def upload_media(request: Request, response: Response, image: UploadFile, _: str = Depends(require_admin)):
    if image.content_type not in {"image/jpeg", "image/png", "image/gif"}:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Ảnh LinkedIn chỉ hỗ trợ JPEG, PNG và GIF",
        )
    # Reject spoofed MIME metadata before the object enters shared storage.
    content = image.file.read(settings.MEDIA_MAX_UPLOAD_MB * 1024 * 1024 + 1)
    image.file.seek(0)
    if len(content) > settings.MEDIA_MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Kích thước hình ảnh vượt quá giới hạn cho phép",
        )
    try:
        validated = validate_image_bytes(content)
    except LinkedInError as error:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Nội dung file không khớp định dạng ảnh được hỗ trợ",
        ) from error
    if validated.media_type != image.content_type:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="MIME type không khớp với nội dung file ảnh",
        )
    file_name = Path(image.filename or "Ảnh tải lên").name
    object_key = StorageService.upload_image(image, folder="linkedin")
    alt_text = " ".join(Path(file_name).stem.replace("_", " ").replace("-", " ").split()) or "Ảnh tải lên"
    return UploadedMedia(
        objectKey=object_key,
        fileName=file_name,
        altText=alt_text,
        order=1,
    ).model_dump()
