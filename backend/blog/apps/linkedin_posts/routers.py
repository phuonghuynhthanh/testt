"""Admin-only provider diagnostics and safe Pexels search."""

from fastapi import APIRouter, Depends, HTTPException, status

from apps.auth.services import require_admin
from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.services.organization import OrganizationVerifier
from apps.linkedin_posts.services.pexels import PexelsService
from apps.linkedin_posts.schemas import (
    IndependentDraftRequest,
    LinkedInPostCreate,
    LinkedInPostUpdate,
)
from apps.linkedin_posts.services.posts import LinkedInPostService
from config import settings

router = APIRouter(prefix="/linkedin", tags=["LinkedIn"])


# Generate a standalone preview without persisting or posting it.
@router.post("/ai/generate-draft")
async def generate_draft(
    data: IndependentDraftRequest, _: str = Depends(require_admin)
):
    return await LinkedInPostService.generate_draft(data)


# Return standalone LinkedIn records without calling the provider.
@router.get("/posts")
def list_posts(_: str = Depends(require_admin)):
    return LinkedInPostService.list()


# Return one standalone LinkedIn record.
@router.get("/posts/{post_id}")
def get_post(post_id: str, _: str = Depends(require_admin)):
    return LinkedInPostService.serialize(LinkedInPostService.get(post_id))


# Save reviewed content or explicitly persist and publish it in one request.
@router.post("/posts")
async def create_post(data: LinkedInPostCreate, _: str = Depends(require_admin)):
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


# Publish an existing reviewed post without generating or selecting new media.
@router.post("/posts/{post_id}/publish")
async def publish_post(post_id: str, _: str = Depends(require_admin)):
    return await LinkedInPostService.publish(post_id)


# Retry only a safely failed provider operation.
@router.post("/posts/{post_id}/retry")
async def retry_post(post_id: str, _: str = Depends(require_admin)):
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
            if error.code in {"linkedin_unavailable", "network_error"}
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
