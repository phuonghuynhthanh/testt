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
from apps.packages import schemas
from apps.packages.services.package import PackageService


router = APIRouter(prefix="", tags=["Packages"])

@router.get(
    "/packages",
    summary="Get all packages",
    description="Get a list of packages",
    status_code=status.HTTP_200_OK,
)
def get_packages():
    return PackageService.get_packages()

# @router.get(
#     "/package/{package_id}",
#     summary="Get package by ID",
#     description="Retrieve a package by its ID",
#     status_code=status.HTTP_200_OK,
# )
# def get_package(package_id: str):
#     return PackageService.get_by_id(package_id=package_id)

@router.post(
    "/package",
    summary="Create a new package",
    description="Create a new package",
    status_code=status.HTTP_201_CREATED,
)
def create_package(package: str = Form(None), 
                   file: Optional[UploadFile] = File(None),
                   current_user: UserSchema = Depends(AccountService.current_blog_user)
                   ):
    package_data = schemas.CreatePackageSchema(**json.loads(package))
    return PackageService.create_package(data=package_data, file=file)

@router.put(
    "/package/{package_id}",
    summary="Update an existing package",
    description="Update a package by its ID",
    status_code=status.HTTP_200_OK,
)
def update_package(package_id: int, package: Optional[str] = Form(None), file: Optional[UploadFile] = File(None), 
                    current_user: UserSchema = Depends(AccountService.current_blog_user)
                   ):
    package_data = None
    if package:
        package_data = schemas.UpdatePackageSchema(**json.loads(package))
    return PackageService.update_package(id=package_id, data=package_data, file=file)

@router.delete(
    "/package/{package_id}",
    summary="Delete a package by ID",
    description="Delete a package by its ID",
    status_code=status.HTTP_200_OK,
)
def delete_package(package_id: int, 
                   current_user: UserSchema = Depends(AccountService.current_blog_user)
                   ) -> dict:
    return PackageService.delete_package(package_id)