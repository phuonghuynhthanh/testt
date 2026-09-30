"""Organization-only LinkedIn verification."""

import re

import httpx

from apps.linkedin_posts.exceptions import LinkedInError
from apps.linkedin_posts.schemas import OrganizationVerification
from apps.linkedin_posts.services.linkedin_client import LINKEDIN_API, LinkedInClient

INTROSPECTION_URL = "https://www.linkedin.com/oauth/v2/introspectToken"
POSTING_ROLES = {"ADMINISTRATOR", "DIRECT_SPONSORED_CONTENT_POSTER", "CONTENT_ADMIN", "CONTENT_ADMINISTRATOR"}
IMAGE_ROLES = {"ADMINISTRATOR", "DIRECT_SPONSORED_CONTENT_POSTER"}


# Validate the strictly organization-only configuration; never fall back to a person URN.
def validate_organization_config(client_id: str, client_secret: str, organization_urn: str) -> None:
    if not client_id.strip() or not client_secret.strip():
        raise LinkedInError("configuration_error", "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are required.")
    if not re.fullmatch(r"urn:li:organization:\d+", organization_urn.strip()):
        raise LinkedInError("configuration_error", "LINKEDIN_ORGANIZATION_URN must use urn:li:organization:<id>.")


class OrganizationVerifier:
    """Verify identity, scopes, ACL roles, and target Page before publishing."""

    # Retain configuration privately; results never include any token or secret.
    def __init__(self, access_token: str, client_id: str, client_secret: str, organization_urn: str, version: str, client: httpx.AsyncClient | None = None) -> None:
        validate_organization_config(client_id, client_secret, organization_urn)
        self.client_id, self.client_secret, self.organization_urn = client_id.strip(), client_secret.strip(), organization_urn.strip()
        self.linkedin = LinkedInClient(access_token, version, client)

    # Request and validate a JSON provider payload without surfacing raw bodies.
    async def _json(self, method: str, url: str, *, stage: str, headers: dict | None = None, **kwargs) -> dict:
        try:
            response = await self.linkedin.request(method, url, stage=stage, headers=headers or self.linkedin.headers(), **kwargs)
        except LinkedInError as error:
            if stage == "organization lookup" and error.provider_status == 404:
                raise LinkedInError("organization_not_found", "LinkedIn could not find the configured organization.", 404) from error
            raise
        try:
            payload = response.json()
        except ValueError as error:
            raise LinkedInError("invalid_response", f"LinkedIn returned malformed JSON for {stage}.", response.status_code) from error
        if not isinstance(payload, dict):
            raise LinkedInError("invalid_response", f"LinkedIn returned an invalid {stage} response.")
        return payload

    # Perform all source-proven verification checks for a Company Page token.
    async def verify(self) -> OrganizationVerification:
        identity = await self._json("GET", f"{LINKEDIN_API}/v2/userinfo", stage="identity verification", headers={"Authorization": f"Bearer {self.linkedin.access_token}"})
        if not isinstance(identity.get("sub"), str) or not identity["sub"].strip():
            raise LinkedInError("invalid_response", "LinkedIn identity response did not include a subject identifier.")
        introspection = await self._json("POST", INTROSPECTION_URL, stage="token introspection", headers={"Content-Type": "application/x-www-form-urlencoded"}, data={"client_id": self.client_id, "client_secret": self.client_secret, "token": self.linkedin.access_token})
        if introspection.get("active") is not True or introspection.get("client_id") not in {None, self.client_id}:
            raise LinkedInError("inactive_token", "LinkedIn reports this token is inactive or belongs to another app.")
        if not isinstance(introspection.get("scope"), str):
            raise LinkedInError("invalid_response", "LinkedIn token introspection did not return OAuth scopes.")
        scopes = sorted(set(introspection["scope"].replace(",", " ").split()))
        if "rw_organization_admin" not in scopes:
            raise LinkedInError("insufficient_scope", "Token needs rw_organization_admin to discover Page roles.")
        acl = await self._json("GET", f"{LINKEDIN_API}/rest/organizationAcls?q=roleAssignee&count=100", stage="organization access verification")
        elements = acl.get("elements")
        if not isinstance(elements, list):
            raise LinkedInError("invalid_response", "LinkedIn organization access response has no elements array.")
        roles = []
        for item in elements:
            if not isinstance(item, dict) or not all(isinstance(item.get(field), str) for field in ("role", "state", "roleAssignee")) or not isinstance(item.get("organization", item.get("organizationTarget")), str):
                raise LinkedInError("invalid_response", "LinkedIn returned a malformed organization role.")
            if item.get("organization", item.get("organizationTarget")) == self.organization_urn:
                roles.append({"role": item["role"], "state": item["state"], "roleAssignee": item["roleAssignee"]})
        if not roles:
            raise LinkedInError("no_organization_role", "The authenticated member has no role for this organization.")
        assignees = {item["roleAssignee"] for item in roles}
        if len(assignees) != 1 or not re.fullmatch(r"urn:li:person:[^:\s]+", str(next(iter(assignees)))):
            raise LinkedInError("invalid_response", "LinkedIn returned inconsistent organization role assignees.")
        organization_id = self.organization_urn.rsplit(":", 1)[1]
        organization = await self._json("GET", f"{LINKEDIN_API}/rest/organizations/{organization_id}", stage="organization lookup")
        if str(organization.get("id")) != organization_id or not str(organization.get("localizedName", "")).strip():
            raise LinkedInError("invalid_response", "LinkedIn returned an invalid organization lookup response.")
        approved = {item["role"] for item in roles if item["state"] == "APPROVED"}
        writable = "w_organization_social" in scopes
        organization_result = {"urn": self.organization_urn, "name": organization["localizedName"].strip()}
        if isinstance(organization.get("vanityName"), str) and organization["vanityName"].strip():
            organization_result["vanityName"] = organization["vanityName"].strip()
        return OrganizationVerification(identity={**identity, "urn": next(iter(assignees))}, organization=organization_result, roles=[{"role": item["role"], "state": item["state"]} for item in roles], scopes=scopes, permissions={"organizationRead": True, "organizationSocialRead": "r_organization_social" in scopes, "organizationWrite": writable, "imageUpload": writable and bool(approved & IMAGE_ROLES)}, readyForOrganicPosting=writable and bool(approved & POSTING_ROLES))
