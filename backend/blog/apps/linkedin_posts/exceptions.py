"""Typed errors returned by the LinkedIn domain."""


class LinkedInError(Exception):
    """Keep provider failure metadata available to the publication boundary."""

    # Store safe error metadata without retaining credential-bearing responses.
    def __init__(
        self,
        code: str,
        message: str,
        provider_status: int | None = None,
        *,
        retryable: bool = False,
        duplicate_risk: bool = False,
        retry_after_ms: int | None = None,
        attempts: int = 1,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.provider_status = provider_status
        self.retryable = retryable
        self.duplicate_risk = duplicate_risk
        self.retry_after_ms = retry_after_ms
        self.attempts = attempts

    # Serialize only operational metadata that is safe for an administrator response.
    def as_dict(self) -> dict:
        return {
            "code": self.code,
            "message": str(self),
            "providerStatus": self.provider_status,
            "retryable": self.retryable,
            "duplicateRisk": self.duplicate_risk,
            "retryAfterMs": self.retry_after_ms,
            "attempts": self.attempts,
        }
