import json

from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    UploadFile,
    status,
)

from apps.accounts.schemas import UserSchema
from apps.accounts.services.authenticate import AccountService
from apps.experts import schemas
from apps.experts.services.expert import ExpertService


router = APIRouter(prefix="", tags=["Experts"])

@router.get(
    "/experts",
    summary="Get all experts",
    description="Retrieve a list of all experts.",
    status_code=status.HTTP_200_OK,
)
def get_experts():
    return ExpertService.get_experts()

@router.get(
    "/expert/{expert_id}",
    summary="Get expert by ID",
    description="Retrieve expert information by their ID.",
    status_code=status.HTTP_200_OK,
)
def get_expert(expert_id: int) -> schemas.ExpertInfor:
    return ExpertService.get_by_id(expert_id)

@router.post(
    "/expert",
    summary="Create a new expert",
    description="Create a new expert.",
    status_code=status.HTTP_201_CREATED,
)
def create_expert(expert: str = Form(...), image: UploadFile = File(...), current_user: UserSchema = Depends(AccountService.current_blog_user)) -> schemas.ExpertInfor:
    expert_data = schemas.ExpertCreate(**json.loads(expert))
    return ExpertService.create_expert(expert_data, image)

@router.put(
    "/expert/{expert_id}",
    summary="Update an existing expert",
    description="Update an expert by their ID.",
    status_code=status.HTTP_200_OK,
)
def update_expert(expert_id: int, expert: Optional[str] = Form(None), image: Optional[UploadFile] = File(None), current_user: UserSchema = Depends(AccountService.current_blog_user)) -> schemas.ExpertInfor:
    expert_data = None
    if expert:
        expert_data = schemas.ExpertUpdate(**json.loads(expert))
    return ExpertService.update_expert(id=expert_id, data=expert_data, image=image)

@router.delete(
    "/expert/{expert_id}",
    summary="Delete an expert",
    description="Delete an expert by their ID.",
    status_code=status.HTTP_200_OK,
)
def delete_expert(expert_id: int, current_user: UserSchema = Depends(AccountService.current_blog_user)) -> dict:
    return ExpertService.delete_expert(expert_id)