"""Pexels search, ranking, and safe selected-image download."""

from urllib.parse import urlencode, urlparse

import httpx

from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.schemas import PexelsCandidate
from apps.linkedin_posts.services.image import validate_image_bytes

SEARCH_URL = "https://api.pexels.com/v1/search"
GENERIC_TERMS = {"and", "business", "finance", "image", "market", "photo", "quant", "quantitative", "technology", "the", "trading", "visual", "with"}


# Accept only HTTPS URLs owned by the expected Pexels host family.
def _safe_url(value: object, host: str) -> str:
    if not isinstance(value, str):
        raise LinkedInError("invalid_response", "Pexels returned an invalid URL.")
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or not (parsed.hostname == host or parsed.hostname.endswith("." + host)):
        raise LinkedInError("invalid_response", "Pexels returned a non-HTTPS or unexpected URL.")
    return value


# Normalize terms for language-tolerant relevance scoring.
def _words(value: str) -> set[str]:
    import re
    import unicodedata

    plain = "".join(char for char in unicodedata.normalize("NFD", value) if unicodedata.category(char) != "Mn").lower()
    return {word for word in re.split(r"[^a-z0-9]+", plain) if len(word) >= 3 and word not in GENERIC_TERMS}


class PexelsService:
    """Search candidates and revalidate a selected image at publication time."""

    # Make provider calls injectable while retaining conservative time and byte limits.
    def __init__(self, api_key: str, client: httpx.AsyncClient | None = None, timeout: float = 10, max_bytes: int = 8 * 1024 * 1024) -> None:
        if timeout <= 0 or max_bytes <= 0:
            raise LinkedInError("invalid_input", "Pexels timeout and byte-size limit must be positive.")
        self.api_key, self.client, self.timeout, self.max_bytes = api_key.strip(), client or httpx.AsyncClient(timeout=timeout), timeout, max_bytes
        self._owns_client = client is None

    # Query landscape candidates across de-duplicated planned keywords and rank relevant results.
    async def search(self, keywords: list[str]) -> list[PexelsCandidate]:
        if not self.api_key:
            raise LinkedInError("configuration_error", "PEXELS_API_KEY is required.")
        queries = list(dict.fromkeys(keyword.strip() for keyword in keywords if keyword.strip()))
        terms = set().union(*(_words(query) for query in queries)) if queries else set()
        candidates: list[tuple[int, dict]] = []
        for query in queries:
            try:
                response = await self.client.get(f"{SEARCH_URL}?{urlencode({'query': query, 'per_page': 15, 'orientation': 'landscape'})}", headers={"Authorization": self.api_key}, timeout=self.timeout)
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, dict) or not isinstance(payload.get("photos"), list):
                    raise ValueError("invalid Pexels response")
                photos = payload["photos"]
            except (httpx.HTTPError, ValueError) as error:
                if not candidates:
                    raise LinkedInError("request_failed", "Pexels search failed.") from error
                break
            for photo in photos if isinstance(photos, list) else []:
                if not isinstance(photo, dict):
                    continue
                score = len(terms & _words(f"{photo.get('alt', '')} {photo.get('url', '')}"))
                if score or not terms:
                    candidates.append((score, photo))
        result, seen = [], set()
        for _, photo in sorted(candidates, key=lambda item: item[0], reverse=True):
            identifier = str(photo.get("id", ""))
            if not identifier or identifier in seen or not isinstance(photo.get("src"), dict) or not str(photo.get("photographer", "")).strip():
                continue
            seen.add(identifier)
            src = photo["src"].get("large2x") or photo["src"].get("large") or photo["src"].get("original")
            try:
                result.append(PexelsCandidate(providerId=identifier, sourceUrl=_safe_url(photo.get("url"), "pexels.com"), imageUrl=_safe_url(src, "images.pexels.com"), photographer=photo["photographer"].strip(), attribution=f"Photo by {photo['photographer'].strip()} on Pexels", altText=str(photo.get("alt") or "Pexels image").strip()))
            except (LinkedInError, ValueError):
                continue
        return result

    # Download bounded bytes and validate both redirected host, MIME, and binary signature.
    async def download(self, candidate: PexelsCandidate):
        image_url = _safe_url(candidate.imageUrl, "images.pexels.com")
        try:
            async with self.client.stream("GET", image_url, timeout=self.timeout) as response:
                response.raise_for_status()
                if response.url:
                    _safe_url(str(response.url), "images.pexels.com")
                content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
                if content_type not in {"image/png", "image/jpeg", "image/gif"}:
                    raise LinkedInError("invalid_image", "Pexels image has an unsupported MIME type.")
                chunks, total = [], 0
                async for chunk in response.aiter_bytes():
                    total += len(chunk)
                    if total > self.max_bytes:
                        raise LinkedInError("invalid_image", "Pexels image exceeds the byte-size limit.")
                    chunks.append(chunk)
        except httpx.HTTPError as error:
            raise LinkedInError("request_failed", "Pexels image download failed.") from error
        image = validate_image_bytes(b"".join(chunks))
        if image.media_type != content_type:
            raise LinkedInError("invalid_image", "Pexels image MIME type does not match its content.")
        return image
