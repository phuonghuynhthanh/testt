from fastapi import APIRouter, Depends, HTTPException, status

from apps.accounts import schemas
from apps.accounts.services.authenticate import AccountService
from apps.accounts.services.firebase import FirebaseService
from apps.accounts.services.platform_user import PlatformUserRepository

router = APIRouter(tags=["Users"])


# Ensure endpoint can only be used by admin accounts.
def _require_admin(current_user: schemas.UserSchema) -> None:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: admin only",
        )


@router.get(
    "/account/me",
    summary="Get current staff/admin profile",
    description="Returns the authenticated platform user if they have staff or admin role.",
    status_code=status.HTTP_200_OK,
    response_model=schemas.UserMeResponse,
)
async def get_me(
    current_user: schemas.UserSchema = Depends(AccountService.current_user),
) -> schemas.UserMeResponse:
    # Read-only profile from shared platform users table.
    user = PlatformUserRepository.get_by_id(current_user.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: staff or admin role required",
        )

    return schemas.UserMeResponse(
        user_id=user["user_id"],
        email=user["email"] or current_user.email,
        role=user["role"] or current_user.role,
        user_profile=user["user_profile"],
        scopes=user.get("scopes") or current_user.scopes,
    )


@router.get(
    "/admin/accounts",
    summary="List non-user accounts",
    description="Returns accounts where role is not user for permission management.",
    status_code=status.HTTP_200_OK,
    response_model=schemas.GetNonUserAccountsResponse,
)
async def get_non_user_accounts(
    current_user: schemas.UserSchema = Depends(AccountService.current_user),
) -> schemas.GetNonUserAccountsResponse:
    # Restrict account permission administration to admin role only.
    _require_admin(current_user)
    users = PlatformUserRepository.list_non_user_accounts()
    return schemas.GetNonUserAccountsResponse(users=users)


@router.put(
    "/admin/account/scopes",
    summary="Update scopes for a non-user account",
    description="Updates feature scopes on shared users table.",
    status_code=status.HTTP_200_OK,
    response_model=schemas.UpdateAccountScopesResponse,
)
async def update_account_scopes(
    payload: schemas.UpdateAccountScopesRequest,
    current_user: schemas.UserSchema = Depends(AccountService.current_user),
) -> schemas.UpdateAccountScopesResponse:
    # Restrict account permission administration to admin role only.
    _require_admin(current_user)
    target = PlatformUserRepository.get_by_id(payload.user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if (target.get("role") or "").strip().lower() == "user":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign scopes to role user",
        )
    updated = PlatformUserRepository.update_scopes(
        payload.user_id,
        payload.scopes.model_dump(by_alias=True),
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to update scopes")
    return schemas.UpdateAccountScopesResponse(
        user_id=updated["user_id"],
        role=updated.get("role"),
        scopes=updated.get("scopes") or {},
    )


# Create staff account by provisioning Firebase user and shared platform row.
@router.post(
    "/admin/account/staff-create",
    summary="Create a staff account",
    description="Admin-only endpoint to create Firebase account and staff row in users table.",
    status_code=status.HTTP_201_CREATED,
    response_model=schemas.CreateStaffAccountResponse,
)
async def create_staff_account(
    payload: schemas.CreateStaffAccountRequest,
    current_user: schemas.UserSchema = Depends(AccountService.current_user),
) -> schemas.CreateStaffAccountResponse:
    # Restrict staff creation to admin role only.
    _require_admin(current_user)
    normalized_email = str(payload.email).strip().lower()

    # Reject conflicts if email already exists in users table.
    if PlatformUserRepository.exists_by_email(normalized_email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists in users table",
        )

    # Reject conflicts if email already exists in Firebase auth.
    firebase_exists = FirebaseService.email_exists(normalized_email)
    if isinstance(firebase_exists, str):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=firebase_exists)
    if firebase_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists in Firebase",
        )

    created_uid = FirebaseService.create_email_password_user(
        normalized_email,
        payload.password.get_secret_value(),
    )
    if isinstance(created_uid, dict):
        if created_uid.get("error") == "email_exists":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=created_uid.get("message", "Email already exists in Firebase"),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=created_uid.get("message", "Failed to create Firebase user"),
        )

    if PlatformUserRepository.exists_by_user_id(created_uid):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User id already exists in users table",
        )

    created_user = PlatformUserRepository.create_staff_account(created_uid, normalized_email)
    if not created_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create staff account in users table",
        )

    return schemas.CreateStaffAccountResponse(
        user_id=created_user["user_id"],
        email=created_user["email"],
        role=created_user["role"] or "staff",
        scopes=created_user.get("scopes") or {},
    )
