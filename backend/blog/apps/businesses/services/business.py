from contextlib import contextmanager
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status

from apps.businesses.models import Business
from apps.businesses.schemas import BusinessCreate, BusinessInfor, BusinessUpdate
from apps.core.storage import StorageService
from apps.core.date_time import DateTime
from config.database import DatabaseManager


class BusinessService:
    """Service class for managing business operations"""
    @staticmethod
    @contextmanager
    def get_db_session():
        """Context manager for database sessions"""
        session = DatabaseManager.session
        try:
            yield session
        finally:
            session.close()

    @classmethod
    def get_businesses(cls) -> List[BusinessInfor]:
        """Get a list of all businesses"""
        try:
            with cls.get_db_session() as session:
                businesses = session.query(Business).all()
                return [BusinessInfor(**business.__dict__) for business in businesses] if businesses else []
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve businesses: {str(e)}",
            )

    @classmethod
    def get_by_id(cls, business_id: int) -> BusinessInfor:
        """Get a business by its ID"""
        try:
            with cls.get_db_session() as session:
                business = session.query(Business).filter(Business.id == business_id).first()
                if business:
                    return BusinessInfor(**business.__dict__)
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Business with ID {business_id} not found",
                    )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve business: {str(e)}",
            )

    @staticmethod
    def delete_image_url(url: str) -> None:
        if url:
            try:
                StorageService.delete_image(url)
            except Exception:
                pass

    @classmethod
    def create_business(cls, data: BusinessCreate, images: List[UploadFile]) -> Business:
        """Create a new business"""
        try:
            image_urls = []
            if images:
                for image in images:
                    image_url = StorageService.upload_image(image)
                    image_urls.append(image_url)
            with cls.get_db_session() as session:
                business = Business.create(
                    name=data.name,
                    type=data.type,
                    city=data.city,
                    district=data.district,
                    min_price=data.min_price,
                    max_price=data.max_price,
                    address=data.address,
                    description=data.description,
                    images=image_urls
                )
                return business
        except IntegrityError:
            for url in image_urls:
                cls.delete_image_url(url)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business already exists",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create business: {str(e)}",
            )
        
    @classmethod
    def update_business(cls, id: int, data: Optional[BusinessUpdate] = None, images: Optional[List[UploadFile]] = None) -> Business:
        """Update an existing business"""
        try:
            with cls.get_db_session() as session:
                business = session.query(Business).filter(Business.id == id).first()
                if not business:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Business with ID {id} not found",
                    )
                update_data = {"modified_at": DateTime.now()}
                image_urls = []
                if data:
                    update_data["name"] = data.name if data.name is not None else business.name
                    update_data["type"] = data.type if data.type is not None else business.type
                    update_data["city"] = data.city if data.city is not None else business.city
                    update_data["district"] = data.district if data.district is not None else business.district
                    update_data["min_price"] = data.min_price if data.min_price is not None else business.min_price
                    update_data["max_price"] = data.max_price if data.max_price is not None else business.max_price
                    update_data["address"] = data.address if data.address is not None else business.address
                    update_data["description"] = data.description if data.description is not None else business.description

                    if data.images is not None:
                        for image in data.images:
                            image_urls.append(image)               
                if images is not None:
                    for image in business.images:
                        if image not in image_urls:
                            cls.delete_image_url(image)
                    for image in images:
                        image_url = StorageService.upload_image(image)
                        image_urls.append(image_url)
                update_data["images"] = image_urls
                return Business.update(id, **update_data)
        except Exception as e:
            for url in image_urls:
                cls.delete_image_url(url)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update business: {str(e)}",
            )
    
    @classmethod
    def delete_business(cls, id: int) -> dict:
        """Delete a business by its ID"""
        try:
            with cls.get_db_session() as session:
                business = session.query(Business).filter(Business.id == id).first()
                if not business:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Business with ID {id} not found",
                    )
                if business.images:
                    for image in business.images:
                        cls.delete_image_url(image)
                session.delete(business)
                session.commit()
                return {"detail": "Business deleted successfully"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete business: {str(e)}",
            )