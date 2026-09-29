"""Admin-only provider diagnostics and safe Pexels search."""

from fastapi import APIRouter, Depends, HTTPException, status

from apps.auth.services import require_admin
from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.services.organization import OrganizationVerifier
from apps.linkedin_posts.services.pexels import PexelsService
from config import settings

router = APIRouter(prefix="/linkedin", tags=["LinkedIn"])


# Construct the configured organization verifier without exposing configuration.
def _verifier() -> OrganizationVerifier:
    return OrganizationVerifier(settings.LINKEDIN_ACCESS_TOKEN, settings.LINKEDIN_CLIENT_ID, settings.LINKEDIN_CLIENT_SECRET, settings.LINKEDIN_ORGANIZATION_URN, settings.LINKEDIN_VERSION)


# Convert a provider exception into a credential-safe operational HTTP response.
def _http_error(error: LinkedInError) -> HTTPException:
    code = status.HTTP_429_TOO_MANY_REQUESTS if error.code == "rate_limited" else status.HTTP_503_SERVICE_UNAVAILABLE if error.code in {"linkedin_unavailable", "network_error"} else status.HTTP_422_UNPROCESSABLE_ENTITY
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
