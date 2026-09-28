from contextlib import contextmanager
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from fastapi import File, HTTPException, UploadFile, status

from apps.core.storage import StorageService
from apps.core.date_time import DateTime
from apps.experts.models import Expert
from apps.experts.schemas import ExpertCreate, ExpertInfor, ExpertUpdate
from config.database import DatabaseManager


class ExpertService:
    """Service class for managing expert operations"""
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
    def get_experts(cls) -> List[ExpertInfor]:
        """Get a list of all experts"""
        try:
            with cls.get_db_session() as session:
                experts = session.query(Expert).all()
                return [ExpertInfor(**expert.__dict__) for expert in experts] if experts else []
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve experts: {str(e)}",
            )

    @classmethod
    def get_by_id(cls, expert_id: int) -> ExpertInfor:
        """Get an expert by its ID"""
        try:
            with cls.get_db_session() as session:
                expert = session.query(Expert).filter(Expert.id == expert_id).first()
                if expert:
                    return ExpertInfor(**expert.__dict__)
                else:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Expert with ID {expert_id} not found",
                    )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve expert: {str(e)}",
            )

    @staticmethod
    def delete_image_url(url: str) -> None:
        if url:
            try:
                StorageService.delete_image(url)
            except Exception:
                pass

    @classmethod
    def create_expert(cls, data: ExpertCreate, image: UploadFile) -> Expert:
        """Create a new expert"""
        try:
            image_url = StorageService.upload_image(image)
            with cls.get_db_session() as session:
                expert = Expert.create(
                    name=data.name,
                    image=image_url,
                    title=data.title,
                    experience=data.experience,
                    category=data.category,
                )
                return expert
        except IntegrityError:
            cls.delete_image_url(image_url)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expert already exists",
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create expert: {str(e)}",
            )
        
    @classmethod
    def update_expert(cls, id: int, data: Optional[ExpertUpdate] = None, image: Optional[UploadFile] = File(None)) -> Expert:
        """Update an existing expert"""
        try:
            new_url = ""
            with cls.get_db_session() as session:
                expert = session.query(Expert).filter(Expert.id == id).first()
                if not expert:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Expert with ID {id} not found",
                    )
                update_data = {"modified_at": DateTime.now()}
                if data:
                    update_data["name"] = data.name if data.name is not None else expert.name
                    update_data["title"] = data.title if data.title is not None else expert.title
                    update_data["experience"] = data.experience if data.experience is not None else expert.experience
                    update_data["category"] = data.category if data.category is not None else expert.category
                    if image is not None:
                        cls.delete_image_url(expert.image)
                        new_url = StorageService.upload_image(image)
                        update_data["image"] = new_url
                return Expert.update(id, **update_data)
        except Exception as e:
            cls.delete_image_url(new_url)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update expert: {str(e)}",
            )
    
    @classmethod
    def delete_expert(cls, id: int) -> dict:
        """Delete a expert by its ID"""
        try:
            with cls.get_db_session() as session:
                expert = session.query(Expert).filter(Expert.id == id).first()
                if not expert:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Expert with ID {id} not found",
                    )
                cls.delete_image_url(expert.image)
                session.delete(expert)
                session.commit()
                return {"detail": "Expert deleted successfully"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete expert: {str(e)}",
            )