"""Gemini structured-output provider owned solely by the LinkedIn domain."""

import json

import httpx

from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.schemas import FactualReview, GeneratedPost


# Extract the first structured text candidate from Gemini's response envelope.
def _structured_text(payload: object) -> str:
    if not isinstance(payload, dict):
        raise LinkedInError("invalid_response", "Gemini returned an invalid response.")
    for candidate in payload.get("candidates", []):
        if not isinstance(candidate, dict):
            continue
        for part in candidate.get("content", {}).get("parts", []) if isinstance(candidate.get("content"), dict) else []:
            if isinstance(part, dict) and isinstance(part.get("text"), str):
                return part["text"]
    raise LinkedInError("invalid_response", "Gemini response has no structured output.")


class GeminiLinkedInProvider:
    """Request strict JSON drafts and independent factual reviews from Gemini."""

    # Retain an injectable client so all normal tests stay offline.
    def __init__(self, api_key: str, model: str | None, client: httpx.AsyncClient | None = None) -> None:
        self.api_key, self.model, self.client = api_key.strip(), (model or "gemini-3.5-flash-lite").strip(), client or httpx.AsyncClient(timeout=30.0)
        self._owns_client = client is None

    # Send one strict JSON-schema request without logging prompts or credentials.
    async def _request(self, system: str, prompt: str, schema: dict, action: str) -> dict:
        if not self.api_key:
            raise LinkedInError("configuration_error", "GEMINI_API_KEY is required.")
        try:
            response = await self.client.post(f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent", headers={"Content-Type": "application/json", "x-goog-api-key": self.api_key}, json={"systemInstruction": {"parts": [{"text": system}]}, "contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json", "responseJsonSchema": schema}})
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise LinkedInError("request_failed", f"Gemini could not {action}.", getattr(getattr(error, "response", None), "status_code", None), retryable=True) from error
        try:
            return json.loads(_structured_text(response.json()))
        except (ValueError, json.JSONDecodeError) as error:
            raise LinkedInError("invalid_response", "Gemini returned invalid structured JSON.") from error

    # Generate and strictly parse one post proposal.
    async def generate(self, system: str, prompt: str) -> GeneratedPost:
        try:
            return GeneratedPost.model_validate(await self._request(system, prompt, GeneratedPost.model_json_schema(), "generate a draft"))
        except ValueError as error:
            raise LinkedInError("invalid_response", "Gemini structured post did not match the required schema.") from error

    # Request a review that identifies facts without rewriting the draft.
    async def review(self, post: GeneratedPost) -> FactualReview:
        prompt = "\n".join(["Rà soát draft LinkedIn dưới đây. Đánh dấu mọi claim không chắc chắn cần người duyệt xác minh, tập trung vào:", "- numerical/statistical claims", "- causal claims", "- market/trading behavior", "- technical equivalence", "- sweeping generalizations", "- comparative/superlative claims", "- claims về VietQuant", "Đặc biệt rà soát các từ/cấu trúc tuyệt đối như: luôn, y hệt, chắc chắn, sẽ, ngay lập tức, hoàn hảo; và causal claim quá mạnh.", "Với claim technical/market chưa đủ căn cứ, cần note rằng wording nên chính xác theo hướng có thể, trong một số trường hợp, không đảm bảo, hoặc có điểm tương đồng.", "Analogy chỉ tạo intuition, không được biến thành technical equivalence. Vẫn giữ nhịp viết punchy; không yêu cầu hedge mọi câu.", "Nếu có claim cần xác minh, trả requiresHumanFactCheck=true và ghi từng claim trong factCheckNotes.", "Không sửa hoặc đề xuất viết lại post. Không gọi web/search.", json.dumps({"content": post.content, "insight": post.insight, "connection": post.connection.model_dump(by_alias=True)}, ensure_ascii=False)])
        try:
            return FactualReview.model_validate(await self._request("Bạn là factual reviewer độc lập. Chỉ đánh giá claim; không rewrite bài và không dùng web/search.", prompt, FactualReview.model_json_schema(), "review a draft"))
        except ValueError as error:
            raise LinkedInError("invalid_response", "Gemini factual review did not match the required schema.") from error
