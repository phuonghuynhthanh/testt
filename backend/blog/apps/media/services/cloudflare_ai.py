"""Cloudflare Workers AI image generation behind the CMS boundary."""

import base64
from urllib.parse import quote

import httpx

from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.services.image import validate_image_bytes
from apps.linkedin_posts.schemas import ValidatedImage
from apps.media.schemas import AIImageAspectRatio, AIImageGenerateRequest, AIImageQuality
from config import settings

RUN_URL = "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
DIMENSIONS = {
    AIImageAspectRatio.WIDE: (1024, 576),
    AIImageAspectRatio.SQUARE: (1024, 1024),
    AIImageAspectRatio.PORTRAIT: (768, 960),
    AIImageAspectRatio.STANDARD: (1024, 768),
}
QUALITY_OPTIONS = {
    AIImageQuality.FAST: (4, 7.5),
    AIImageQuality.BALANCED: (8, 7.5),
    AIImageQuality.HIGH: (20, 7.5),
}
DEFAULT_NEGATIVE_PROMPT = (
    "text, letters, words, typography, watermark, logo, brand mark, signature, "
    "UI, infographic, chart labels, numbers, QR code, frame, collage, blurry, "
    "low resolution, distorted anatomy, duplicate objects, clutter"
)


class AIImageError(Exception):
    """Keep provider failures safe for CMS responses."""

    # Store only administrator-safe provider context.
    def __init__(self, code: str, message: str, status_code: int = 502, retryable: bool = False):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.retryable = retryable

    # Return the stable public error shape without raw provider data.
    def as_dict(self) -> dict:
        return {"code": self.code, "message": str(self), "retryable": self.retryable}


class CloudflareAIImageProvider:
    """Run the configured text-to-image model without owning storage behavior."""

    # Permit an injected async client for deterministic provider tests.
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self.client = client or httpx.AsyncClient(timeout=30.0)
        self._owns_client = client is None

    # Verify the server-only configuration at the external boundary.
    @staticmethod
    def _validate_config() -> None:
        if not settings.CLOUDFLARE_ACCOUNT_ID or not settings.CLOUDFLARE_API_TOKEN:
            raise AIImageError("ai_image_model_unavailable", "Cloudflare Workers AI is not configured.", 503)
        if not settings.CLOUDFLARE_IMAGE_MODEL:
            raise AIImageError("ai_image_model_unavailable", "Cloudflare image model is not configured.", 503)

    # Build a concise server-owned editorial brief around the administrator's subject.
    @staticmethod
    def _prompt(data: AIImageGenerateRequest) -> str:
        subject = data.prompt or data.context
        context = f" Supporting context: {data.context}." if data.prompt and data.context else ""
        layout = (
            "Wide blog banner with the subject placed to one side and clean negative space for a separate title overlay."
            if data.purpose.value == "BLOG_BANNER"
            else "LinkedIn feed editorial visual with one clear focal point and an immediately readable silhouette."
        )
        return (
            "Editorial illustration for VietQuant, a Vietnamese quantitative-finance publication. "
            f"Primary subject: {subject}.{context} Format: {data.aspectRatio.value}. {layout} "
            "Depict one coherent, specific scene with a clear visual metaphor; contemporary financial editorial art direction, "
            "professional lighting, restrained palette, high detail. No embedded text, typography, watermark, logo, UI, "
            "stock-photo collage, generic trading screen, or literal piles of cash."
        )

    # Extract Cloudflare's documented numeric error code without exposing its body.
    @staticmethod
    def _provider_code(response: httpx.Response) -> int | None:
        try:
            body = response.json()
            errors = body.get("errors", []) if isinstance(body, dict) else []
            code = errors[0].get("code") if errors and isinstance(errors[0], dict) else None
            return int(code) if code is not None else None
        except (TypeError, ValueError):
            return None

    # Map Cloudflare responses into stable CMS error behavior.
    @classmethod
    def _error(cls, response: httpx.Response) -> AIImageError:
        provider_code = cls._provider_code(response)
        if provider_code == 3036:
            return AIImageError("ai_image_quota_exceeded", "Đã dùng hết hạn mức tạo ảnh AI hôm nay.", 429)
        if provider_code == 3040:
            return AIImageError("ai_image_capacity", "Dịch vụ tạo ảnh AI đang quá tải. Hãy thử lại sau.", 503, True)
        if response.status_code == 429:
            return AIImageError("ai_image_rate_limited", "Dịch vụ tạo ảnh AI đang giới hạn yêu cầu. Hãy thử lại sau.", 429, True)
        if response.status_code in {400, 403, 404}:
            return AIImageError("ai_image_model_unavailable", "Mô hình tạo ảnh AI hiện không khả dụng.", 503)
        if response.status_code in {408, 504}:
            return AIImageError("ai_image_timeout", "Dịch vụ tạo ảnh AI đã hết thời gian chờ.", 504, True)
        return AIImageError("ai_image_provider_error", "Dịch vụ tạo ảnh AI gặp lỗi.", 502, response.status_code >= 500)

    # Decode the binary or encoded image formats returned by the model endpoint.
    @staticmethod
    def _image_bytes(response: httpx.Response) -> bytes:
        content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
        if content_type.startswith("image/"):
            return response.content
        try:
            body = response.json()
            result = body.get("result") if isinstance(body, dict) else None
            if not isinstance(result, str):
                raise ValueError("result is not a string")
            return base64.b64decode(result, validate=True)
        except (ValueError, TypeError, base64.binascii.Error) as error:
            raise AIImageError("ai_image_invalid_response", "Cloudflare trả về dữ liệu ảnh không hợp lệ.") from error

    # Generate and validate an image before any persistent storage operation.
    async def generate(self, data: AIImageGenerateRequest) -> ValidatedImage:
        self._validate_config()
        width, height = DIMENSIONS[data.aspectRatio]
        num_steps, guidance = QUALITY_OPTIONS[data.quality]
        payload = {
            "prompt": self._prompt(data),
            "negative_prompt": ", ".join(filter(None, [DEFAULT_NEGATIVE_PROMPT, data.negativePrompt])),
            "width": width,
            "height": height,
            "num_steps": num_steps,
            "guidance": guidance,
        }
        url = RUN_URL.format(
            account_id=quote(settings.CLOUDFLARE_ACCOUNT_ID, safe=""),
            model=quote(settings.CLOUDFLARE_IMAGE_MODEL, safe="@/"),
        )
        try:
            response = await self.client.post(
                url,
                headers={"Authorization": f"Bearer {settings.CLOUDFLARE_API_TOKEN}"},
                json=payload,
            )
        except httpx.TimeoutException as error:
            raise AIImageError("ai_image_timeout", "Dịch vụ tạo ảnh AI đã hết thời gian chờ.", 504, True) from error
        except httpx.HTTPError as error:
            raise AIImageError("ai_image_provider_error", "Không thể kết nối dịch vụ tạo ảnh AI.", 502, True) from error
        if response.is_error:
            raise self._error(response)
        try:
            image = validate_image_bytes(self._image_bytes(response))
        except LinkedInError as error:
            raise AIImageError("ai_image_invalid_response", "Cloudflare trả về hình ảnh không hợp lệ.") from error
        if (image.width, image.height) != (width, height):
            raise AIImageError("ai_image_invalid_response", "Cloudflare trả về ảnh không đúng kích thước yêu cầu.")
        return image

    # Close only clients constructed by this provider.
    async def close(self) -> None:
        if self._owns_client:
            await self.client.aclose()
