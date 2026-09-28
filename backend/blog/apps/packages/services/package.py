from contextlib import contextmanager
from sqlalchemy.exc import IntegrityError
from typing import List, Optional

from fastapi import File, HTTPException, UploadFile, status

from apps.core.storage import StorageService
from apps.core.date_time import DateTime
from apps.packages.models import Package
from apps.packages.schemas import CreatePackageSchema, PackageFullInfo, PackageSchema, UpdatePackageSchema
from config.database import DatabaseManager


class PackageService:
    """Service class for managing package operations"""
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
    def get_packages(cls) -> List[PackageSchema]:
        """Get a list of all packages"""
        try:
            with cls.get_db_session() as session:
                packages = session.query(Package).all()
                return [PackageSchema(**package.__dict__) for package in packages] if packages else []
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve packages: {str(e)}",
            )

    # @classmethod
    # def get_by_id(cls, package_id: str) -> PackageFullInfo:
    #     """Get a package by its ID"""
    #     try:
    #         with cls.get_db_session() as session:
    #             package = session.query(Package).filter(Package.id == package_id).first()
    #             if package:
    #                 return PackageFullInfo(**package.__dict__)
    #             else:
    #                 raise HTTPException(
    #                     status_code=status.HTTP_404_NOT_FOUND,
    #                     detail=f"Package with ID {package_id} not found",
    #                 )
    #     except HTTPException:
    #         raise
    #     except Exception as e:
    #         raise HTTPException(
    #             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    #             detail=f"Failed to retrieve package: {str(e)}",
    #         )

    @staticmethod
    def delete_image_url(url: str) -> None:
        if url:
            try:
                StorageService.delete_image(url)
            except Exception:
                pass

    @classmethod
    def create_package(cls, data: CreatePackageSchema, file: Optional[UploadFile] = File(None)):
        """Create a new package"""
        try:
            with cls.get_db_session() as session:
                pdf_url = StorageService.upload_image(file) if file is not None else data.pdf if data.pdf else None
                Package.create(
                    title=data.title,
                    price=data.price,
                    description=data.description,
                    highlights=data.highlights,
                    featured=data.featured,
                    pdf=pdf_url,
                )
                return {"detail": "Package created successfully"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create package: {str(e)}",
            )
        
    @classmethod
    def update_package(cls, id: int, data: Optional[UpdatePackageSchema] = None, file: Optional[UploadFile] = File(None)) -> Package:
        """Update an existing package"""
        try:
            new_url = ""
            with cls.get_db_session() as session:
                package = session.query(Package).filter(Package.id == id).first()
                if not package:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Package with ID {id} not found",
                    )
                update_data = {"modified_at": DateTime.now()}
                if data:
                    update_data["title"] = data.title if data.title is not None else package.title
                    update_data["price"] = data.price if data.price is not None else package.price
                    update_data["description"] = data.description if data.description is not None else package.description
                    update_data["highlights"] = data.highlights if data.highlights is not None else package.highlights
                    update_data["featured"] = data.featured if data.featured is not None else package
                    if file is not None:
                        cls.delete_image_url(package.pdf)
                        new_url = StorageService.upload_image(file)
                        update_data["pdf"] = new_url
                    elif data.pdf is not None:
                        cls.delete_image_url(package.pdf)
                        update_data["pdf"] = data.pdf
                return Package.update(id, **update_data)
        except HTTPException:
            raise
        except Exception as e:
            cls.delete_image_url(new_url)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update package: {str(e)}",
            )
    
    @classmethod
    def delete_package(cls, id: str) -> dict:
        """Delete a package by its ID"""
        try:
            with cls.get_db_session() as session:
                package = session.query(Package).filter(Package.id == id).first()
                if not package:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Package with ID {id} not found",
                    )
                cls.delete_image_url(package.pdf)
                session.delete(package)
                session.commit()
                return {"detail": "Package deleted successfully"}
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete package: {str(e)}",
            )