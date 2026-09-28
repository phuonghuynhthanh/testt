from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr


class UserSchema(BaseModel):
    user_id: str
    email: str
    role: str
    scopes: dict[str, Any] = Field(default_factory=dict)


class UserMeResponse(BaseModel):
    user_id: str
    email: str
    role: str
    user_profile: Optional[dict[str, Any]] = None
    scopes: dict[str, Any] = Field(default_factory=dict)


class ModuleScope(BaseModel):
    enabled: bool = False


class CourseScopeFlags(BaseModel):
    """Per-course staff permissions: content authoring and/or class operations."""

    # `class` is a reserved word, so store as `class_` with a serialized alias.
    model_config = ConfigDict(populate_by_name=True)

    content: bool = False
    class_: bool = Field(default=False, alias="class")


class CertificateScope(BaseModel):
    enabled: bool = False
    courses: dict[str, CourseScopeFlags] = Field(default_factory=dict)


class UserScopes(BaseModel):
    blog: ModuleScope = Field(default_factory=ModuleScope)
    event: ModuleScope = Field(default_factory=ModuleScope)
    certificate: CertificateScope = Field(default_factory=CertificateScope)


class NonUserAccountItem(BaseModel):
    user_id: str
    email: str = ""
    role: Optional[str] = None
    scopes: UserScopes = Field(default_factory=UserScopes)


class GetNonUserAccountsResponse(BaseModel):
    users: list[NonUserAccountItem]


class UpdateAccountScopesRequest(BaseModel):
    user_id: str
    scopes: UserScopes


class UpdateAccountScopesResponse(BaseModel):
    user_id: str
    role: Optional[str] = None
    scopes: UserScopes = Field(default_factory=UserScopes)


class CreateStaffAccountRequest(BaseModel):
    email: EmailStr
    password: SecretStr = Field(min_length=8, max_length=128)


class CreateStaffAccountResponse(BaseModel):
    user_id: str
    email: str
    role: str
    scopes: UserScopes = Field(default_factory=UserScopes)
