"""Organization publishing for text, single image, and multi-image posts."""

import re
from urllib.parse import quote, urlparse

from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.schemas import ValidatedImage
from apps.linkedin_posts.services.linkedin_client import LINKEDIN_API, LinkedInClient, error_for_response
from apps.linkedin_posts.services.organization import OrganizationVerifier

POSTS_URL = f"{LINKEDIN_API}/rest/posts"
IMAGE_INITIALIZE_URL = f"{LINKEDIN_API}/rest/images?action=initializeUpload"


# Escape LinkedIn Little Text control characters while preserving real hashtags.
def escape_linkedin_little_text(value: str) -> str:
    import re

    return re.sub(r"#[\w]+|[|{}@\[\]()<>#\\*_~]", lambda match: match.group(0) if match.group(0).startswith("#") and len(match.group(0)) > 1 else "\\" + match.group(0), value, flags=re.UNICODE)


# Require HTTPS uploads returned by a LinkedIn-owned hostname.
def _valid_upload_url(value: object) -> str:
    if not isinstance(value, str):
        raise LinkedInError("invalid_response", "LinkedIn returned an invalid image-upload URL.")
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or not (parsed.hostname == "linkedin.com" or parsed.hostname.endswith(".linkedin.com")):
        raise LinkedInError("invalid_response", "LinkedIn returned an invalid image-upload URL.")
    return value


# Construct the common Company Page post envelope from a verified commentary value.
def _post_payload(author: str, commentary: str) -> dict:
    if not commentary.strip():
        raise LinkedInError("invalid_input", "LinkedIn commentary must not be blank.")
    return {"author": author, "commentary": escape_linkedin_little_text(commentary.strip()), "visibility": "PUBLIC", "distribution": {"feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": []}, "lifecycleState": "PUBLISHED", "isReshareDisabledByAuthor": False}


# Require a post URN returned by LinkedIn before creating a first comment.
def _comment_target_urn(value: str) -> str:
    if not re.fullmatch(r"urn:li:(?:share|ugcPost):[^:\s]+", value.strip()):
        raise LinkedInError("invalid_response", "LinkedIn returned an unusable post ID for comment creation.", duplicate_risk=True)
    return value.strip()


class OrganizationPublisher:
    """Publish only after the configured organization passes fresh verification."""

    # Keep the verifier injectable for deterministic provider tests.
    def __init__(self, verifier: OrganizationVerifier) -> None:
        self.verifier = verifier
        self.linkedin: LinkedInClient = verifier.linkedin
        self.author = verifier.organization_urn

    # Check posting or image-upload readiness before an irreversible provider request.
    async def _verify_ready(self, needs_images: bool = False, needs_comments: bool = False) -> None:
        result = await self.verifier.verify()
        if not result.readyForOrganicPosting or (needs_images and not result.permissions.get("imageUpload")) or (needs_comments and not result.permissions.get("commentCreate")):
            raise LinkedInError("organization_not_ready", "Organization verification did not confirm the required Page role and scope.")

    # Publish a text-only Company Page post and capture x-restli-id if supplied.
    async def publish_text(self, commentary: str, needs_comment: bool = False) -> dict:
        # Verify the main post independently; its optional first comment is checked after publication.
        await self._verify_ready()
        response = await self.linkedin.request("POST", POSTS_URL, stage="post creation", final_create=True, headers=self.linkedin.headers(), json=_post_payload(self.author, commentary))
        if response.status_code != 201:
            raise error_for_response(response, "post creation", final_create=True)
        return {"post_id": response.headers.get("x-restli-id", "").strip() or None}

    # Initialize, safely upload, and return a provider image URN.
    async def _upload_image(self, image: ValidatedImage) -> str:
        response = await self.linkedin.request("POST", IMAGE_INITIALIZE_URL, stage="image upload initialization", headers=self.linkedin.headers(), json={"initializeUploadRequest": {"owner": self.author}})
        try:
            body = response.json().get("value", {})
            upload_url, image_urn = _valid_upload_url(body.get("uploadUrl")), body.get("image")
        except (ValueError, AttributeError) as error:
            raise LinkedInError("invalid_response", "LinkedIn returned an invalid image-upload response.") from error
        if not isinstance(image_urn, str) or not image_urn.startswith("urn:li:image:"):
            raise LinkedInError("invalid_response", "LinkedIn returned an invalid image URN.")
        await self.linkedin.request("PUT", upload_url, stage="image upload", headers={"Authorization": f"Bearer {self.linkedin.access_token}", "Content-Type": image.media_type}, content=image.bytes)
        return image_urn

    # Publish one byte-validated image with source-proven alt-text limits.
    async def publish_single_image(self, commentary: str, image: ValidatedImage, alt_text: str, needs_comment: bool = False) -> dict:
        if not 1 <= len(alt_text.strip()) <= 4086:
            raise LinkedInError("invalid_input", "Image alt text must contain 1 to 4,086 characters.")
        # Verify the main post independently; its optional first comment is checked after publication.
        await self._verify_ready(needs_images=True)
        image_urn = await self._upload_image(image)
        payload = _post_payload(self.author, commentary)
        payload["content"] = {"media": {"id": image_urn, "altText": alt_text.strip()}}
        response = await self.linkedin.request("POST", POSTS_URL, stage="image post creation", final_create=True, headers=self.linkedin.headers(), json=payload)
        if response.status_code != 201:
            raise error_for_response(response, "image post creation", final_create=True)
        return {"post_id": response.headers.get("x-restli-id", "").strip() or None, "image_urn": image_urn}

    # Upload ordered images sequentially so a partial upload can never create a partial post.
    async def publish_multi_image(self, commentary: str, images: list[tuple[ValidatedImage, str]], needs_comment: bool = False) -> dict:
        if not 2 <= len(images) <= 20:
            raise LinkedInError("invalid_input", "A multi-image post requires 2 to 20 images.")
        if any(not 1 <= len(alt.strip()) <= 4086 for _, alt in images):
            raise LinkedInError("invalid_input", "Each image alt text must contain 1 to 4,086 characters.")
        # Verify the main post independently; its optional first comment is checked after publication.
        await self._verify_ready(needs_images=True)
        image_urns = []
        for image, _ in images:
            image_urns.append(await self._upload_image(image))
        payload = _post_payload(self.author, commentary)
        payload["content"] = {"multiImage": {"images": [{"id": urn, "altText": alt.strip()} for urn, (_, alt) in zip(image_urns, images, strict=True)]}}
        response = await self.linkedin.request("POST", POSTS_URL, stage="multi-image post creation", final_create=True, headers=self.linkedin.headers(), json=payload)
        if response.status_code != 201:
            raise error_for_response(response, "multi-image post creation", final_create=True)
        return {"post_id": response.headers.get("x-restli-id", "").strip() or None, "image_urns": image_urns}

    # Create one deterministic Organization Page comment after a confirmed post.
    async def create_organization_comment(self, target_post_urn: str, text: str) -> dict:
        target = _comment_target_urn(target_post_urn)
        if not text.strip():
            raise LinkedInError("invalid_input", "LinkedIn comment text must not be blank.")
        await self._verify_ready(needs_comments=True)
        response = await self.linkedin.request(
            "POST",
            f"{LINKEDIN_API}/rest/socialActions/{quote(target, safe='')}/comments",
            stage="link comment creation",
            final_create=True,
            headers=self.linkedin.headers(),
            json={"actor": self.author, "object": target, "message": {"text": text.strip()}},
        )
        if not 200 <= response.status_code < 300:
            raise error_for_response(response, "link comment creation", final_create=True)
        comment_id = response.headers.get("x-restli-id", "").strip()
        if not comment_id:
            try:
                body = response.json()
                comment_id = str(body.get("id") or body.get("commentUrn") or "").strip()
            except ValueError:
                comment_id = ""
        if not comment_id:
            raise LinkedInError("invalid_response", "LinkedIn confirmed the comment request without an ID.", duplicate_risk=True)
        return {"comment_id": comment_id}
