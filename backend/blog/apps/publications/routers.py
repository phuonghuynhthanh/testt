"""Admin-only APIs for publication configuration and explicit side effects."""

from fastapi import APIRouter, Depends

from apps.auth.services import require_admin
from apps.linkedin_posts.schemas import LinkedInPreviewRequest
from apps.publications.schemas import (
    DraftRequest,
    LinkedInCommandRequest,
    LinkedInContentUpdate,
    MediaSuggestionRequest,
    PublicationUpdate,
)
from apps.publications.services import PublicationService

router = APIRouter(prefix="/publications/blogs", tags=["Publications"])


# Return one Blog's independent channel configuration and state.
@router.get("/{blog_id}")
def get_publication(blog_id: str, _: str = Depends(require_admin)):
    return PublicationService.get(blog_id)


# Configure Web and LinkedIn targets without changing core Blog CRUD payloads.
@router.put("/{blog_id}")
def update_publication(
    blog_id: str, data: PublicationUpdate, _: str = Depends(require_admin)
):
    return PublicationService.update(blog_id, data)


# Preview Blog-derived copy without persisting an association.
@router.post("/{blog_id}/linkedin/preview")
def preview_linkedin(
    blog_id: str, data: LinkedInPreviewRequest, _: str = Depends(require_admin)
):
    return PublicationService.preview(blog_id, data)


# Generate a reviewable SAME or SUMMARY draft; this endpoint never publishes.
@router.post("/{blog_id}/linkedin/draft")
async def draft_linkedin(
    blog_id: str, data: DraftRequest, _: str = Depends(require_admin)
):
    return await PublicationService.draft(blog_id, data)


# Save or immediately publish reviewed Blog-derived LinkedIn content.
@router.post("/{blog_id}/linkedin")
async def command_linkedin(
    blog_id: str, data: LinkedInCommandRequest, _: str = Depends(require_admin)
):
    return await PublicationService.save_linkedin(blog_id, data)


# Save administrator-owned text edits or selected Pexels media metadata.
@router.put("/{blog_id}/linkedin")
def save_linkedin(
    blog_id: str, data: LinkedInContentUpdate, _: str = Depends(require_admin)
):
    return PublicationService.save_custom(blog_id, data)


# Return ranked Pexels candidates without mutating the Blog banner or publication state.
@router.post("/{blog_id}/linkedin/media/suggest")
async def suggest_linkedin_media(
    blog_id: str, data: MediaSuggestionRequest, _: str = Depends(require_admin)
):
    return await PublicationService.suggest_media(blog_id, data)


# Explicitly publish configured channels with Web before LinkedIn when required.
@router.post("/{blog_id}/publish")
async def publish(blog_id: str, _: str = Depends(require_admin)):
    return await PublicationService.publish(blog_id)


# Retry only a failed LinkedIn channel; an already published Web article is never reposted.
@router.post("/{blog_id}/linkedin/retry")
async def retry_linkedin(blog_id: str, _: str = Depends(require_admin)):
    return await PublicationService.publish(blog_id, retry=True)
