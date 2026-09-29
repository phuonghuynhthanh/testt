"""Small HTTP client that preserves LinkedIn error and retry semantics."""

from datetime import UTC, datetime
from email.utils import parsedate_to_datetime

import httpx

from apps.linkedin_posts.exceptions import LinkedInError

LINKEDIN_API = "https://api.linkedin.com"


# Parse either accepted Retry-After header form into milliseconds.
def retry_after_milliseconds(headers: httpx.Headers) -> int | None:
    value = headers.get("retry-after", "").strip()
    if not value:
        return None
    try:
        seconds = float(value)
        return max(0, int(seconds * 1000))
    except ValueError:
        try:
            return max(0, int((parsedate_to_datetime(value).astimezone(UTC) - datetime.now(UTC)).total_seconds() * 1000))
        except (TypeError, ValueError):
            return None


# Convert a LinkedIn HTTP response into a credential-safe domain error.
def error_for_response(response: httpx.Response, stage: str, *, final_create: bool = False) -> LinkedInError:
    status = response.status_code
    if status == 401:
        return LinkedInError("invalid_or_expired_token", "LinkedIn rejected the access token; re-authenticate the member.", status)
    if status == 403:
        return LinkedInError("insufficient_permission", f"LinkedIn denied {stage}; confirm scopes and Page role.", status)
    if status == 429:
        return LinkedInError("rate_limited", f"LinkedIn rate-limited {stage}; retry later.", status, retryable=True, retry_after_ms=retry_after_milliseconds(response.headers))
    if status >= 500:
        return LinkedInError("linkedin_unavailable", f"LinkedIn could not complete {stage}.", status, retryable=not final_create, duplicate_risk=final_create)
    return LinkedInError("request_failed", f"LinkedIn {stage} failed with HTTP {status}.", status)


class LinkedInClient:
    """Make async LinkedIn requests with one safe header construction point."""

    # Keep the injected client testable and avoid constructing it per request.
    def __init__(self, access_token: str, version: str, client: httpx.AsyncClient | None = None) -> None:
        self.access_token = access_token.strip()
        self.version = version.strip()
        self.client = client or httpx.AsyncClient(timeout=15.0)
        self._owns_client = client is None

    # Validate non-secret configuration at the provider boundary.
    def validate(self) -> None:
        import re

        if not self.access_token:
            raise LinkedInError("invalid_input", "LINKEDIN_ACCESS_TOKEN is required.")
        if not re.fullmatch(r"\d{6}", self.version):
            raise LinkedInError("invalid_input", "LINKEDIN_VERSION must use YYYYMM.")

    # Return OAuth and Rest.li headers required by LinkedIn REST APIs.
    def headers(self, json_content: bool = True) -> dict[str, str]:
        values = {"Authorization": f"Bearer {self.access_token}", "Linkedin-Version": self.version, "X-Restli-Protocol-Version": "2.0.0"}
        if json_content:
            values["Content-Type"] = "application/json"
        return values

    # Send a request and distinguish unknown final-create outcomes from safe retries.
    async def request(self, method: str, url: str, *, stage: str, final_create: bool = False, **kwargs) -> httpx.Response:
        self.validate()
        try:
            response = await self.client.request(method, url, **kwargs)
        except httpx.HTTPError as error:
            raise LinkedInError("network_error", f"Could not reach LinkedIn for {stage}.", retryable=not final_create, duplicate_risk=final_create) from error
        if response.is_error:
            raise error_for_response(response, stage, final_create=final_create)
        return response

    # Close only clients created by this domain service.
    async def close(self) -> None:
        if self._owns_client:
            await self.client.aclose()
