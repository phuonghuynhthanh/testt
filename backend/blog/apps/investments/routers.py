import json

from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    status,
)

from apps.accounts.schemas import UserSchema
from apps.accounts.services.authenticate import AccountService
from apps.investments import schemas
from apps.investments.services.investment import InvestmentServices


router = APIRouter(prefix="", tags=["Investments"])

@router.get(
    "/investments",
    summary="Get all investments",
    description="Retrieve a list of all investments.",
    status_code=status.HTTP_200_OK,
)
def get_investments(current_user: UserSchema = Depends(AccountService.current_blog_user)):
    return InvestmentServices.get_investments()

@router.get(
    "/investment/{investment_id}",
    summary="Get investment by ID",
    description="Retrieve investment information by their ID.",
    status_code=status.HTTP_200_OK,
)
def get_investment(investment_id: str, current_user: UserSchema = Depends(AccountService.current_blog_user)):
    return InvestmentServices.get_by_id(investment_id)

@router.post(
    "/investment",
    summary="Create a new investment",
    description="Create a new investment.",
    status_code=status.HTTP_201_CREATED,
)
def create_investment(investment: schemas.InvestmentCreate):
    return InvestmentServices.create_investment(investment)

@router.put(
    "/investment/{investment_id}",
    summary="Update an existing investment",
    description="Update an investment by their ID.",
    status_code=status.HTTP_200_OK,
)
def update_investment(investment_id: str, investment: Optional[schemas.InvestmentUpdate] = None, current_user: UserSchema = Depends(AccountService.current_blog_user)):
    return InvestmentServices.update_investment(id=investment_id, data=investment)

@router.delete(
    "/investment/{investment_id}",
    summary="Delete an investment",
    description="Delete an investment by their ID.",
    status_code=status.HTTP_200_OK,
)
def delete_investment(investment_id: str, current_user: UserSchema = Depends(AccountService.current_blog_user)) -> dict:
    return InvestmentServices.delete_investment(investment_id)

@router.put(
    "/investment",
    summary="Update an existing investment status",
    description="Update an investment by their ID.",
    status_code=status.HTTP_200_OK,
)
def update_investment(investment: schemas.InvestmentUpdateStt):
    return InvestmentServices.update_status(id=investment.id, Istatus=investment.status )