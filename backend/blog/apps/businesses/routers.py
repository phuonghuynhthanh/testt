import json

from typing import List, Optional
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
from apps.businesses import schemas
from apps.businesses.services.business import BusinessService


router = APIRouter(prefix="", tags=["Businesses"])

@router.get(
    "/businesses",
    summary="Get all businesses",
    description="Get a list of businesses",
    status_code=status.HTTP_200_OK,
)
def get_businesses():
    return BusinessService.get_businesses()

@router.get(
    "/business/{business_id}",
    summary="Get business by ID",
    description="Retrieve a business by its ID",
    status_code=status.HTTP_200_OK,
)
def get_business(business_id: int) -> schemas.BusinessInfor:
    return BusinessService.get_by_id(business_id)

@router.post(
    "/business",
    summary="Create a new business",
    description="Create a new business",
    status_code=status.HTTP_201_CREATED,
)
def create_business(business: str = Form(...), images: List[UploadFile] = File(...), current_user: UserSchema = Depends(AccountService.current_blog_user)):
    business_data = schemas.BusinessCreate(**json.loads(business))
    return BusinessService.create_business(data=business_data, images=images)

@router.put(
    "/business/{business_id}",
    summary="Update an existing business",
    description="Update a business by its ID",
    status_code=status.HTTP_200_OK,
)
def update_business(business_id: int, business: Optional[str] = Form(None), images: Optional[List[UploadFile]] = File(None), current_user: UserSchema = Depends(AccountService.current_blog_user)):
    business_data = None
    if business:
        business_data = schemas.BusinessUpdate(**json.loads(business))
    return BusinessService.update_business(id=business_id, data=business_data, images=images)

@router.delete(
    "/business/{business_id}",
    summary="Delete a business",
    description="Delete a business by its ID",
    status_code=status.HTTP_200_OK,
)
def delete_business(business_id: int, current_user: UserSchema = Depends(AccountService.current_blog_user)) -> dict:
    return BusinessService.delete_business(business_id)