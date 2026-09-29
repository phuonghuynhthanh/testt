import logging
import uuid
from datetime import timedelta
from urllib.parse import urlparse

from fastapi import HTTPException, UploadFile, status
from minio import Minio
from minio.error import S3Error

from config import settings

logger = logging.getLogger(__name__)


class StorageService:
    _client: Minio | None = None
    _initialized = False
    _allowed_types = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }

    # Keep object names relative and prevent paths escaping their logical prefix.
    @staticmethod
    def _sanitize_relative_path(path: str) -> str:
        return "/".join(
            part
            for part in path.strip().strip("/").split("/")
            if part not in {"", ".", ".."}
        )

    # Build one SDK client for the process instead of reconnecting per operation.
    @classmethod
    def _get_client(cls) -> Minio:
        if cls._client is None:
            if not all(
                (
                    settings.MINIO_ENDPOINT,
                    settings.MINIO_ACCESS_KEY,
                    settings.MINIO_SECRET_KEY,
                )
            ):
                raise RuntimeError("MinIO endpoint and credentials must be configured")
            cls._client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
                region=settings.MINIO_REGION or None,
            )
        return cls._client

    # Verify the configured bucket, creating it only when explicitly enabled.
    @classmethod
    def initialize(cls) -> None:
        if cls._initialized:
            return
        if not settings.MINIO_BUCKET:
            raise RuntimeError("MinIO bucket must be configured")
        client = cls._get_client()
        if client.bucket_exists(settings.MINIO_BUCKET):
            cls._initialized = True
            return
        if not settings.MINIO_AUTO_CREATE_BUCKET:
            raise RuntimeError(f"MinIO bucket '{settings.MINIO_BUCKET}' does not exist")
        client.make_bucket(
            settings.MINIO_BUCKET, location=settings.MINIO_REGION or "us-east-1"
        )
        cls._initialized = True
        logger.info("Created MinIO bucket %s", settings.MINIO_BUCKET)

    # Determine the stream length without materializing an uploaded image in memory.
    @staticmethod
    def _file_size(image_file: UploadFile) -> int:
        image_file.file.seek(0, 2)
        size = image_file.file.tell()
        image_file.file.seek(0)
        return size

    # Upload an allowed image stream and return only its database-safe object key.
    @classmethod
    def upload_image(cls, image_file: UploadFile, folder: str = "") -> str:
        content_type = image_file.content_type or ""
        extension = cls._allowed_types.get(content_type)
        if extension is None:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Only JPEG, PNG, WebP, and GIF images are supported",
            )

        size = cls._file_size(image_file)
        if size > settings.MEDIA_MAX_UPLOAD_MB * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Image exceeds the upload size limit",
            )

        safe_folder = cls._sanitize_relative_path(folder)
        object_name = f"{uuid.uuid4()}{extension}"
        object_key = f"{safe_folder}/{object_name}" if safe_folder else object_name
        try:
            cls.initialize()
            cls._get_client().put_object(
                settings.MINIO_BUCKET,
                object_key,
                image_file.file,
                size,
                content_type=content_type,
            )
        except HTTPException:
            raise
        except Exception:
            logger.exception("MinIO image upload failed for key %s", object_key)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload image",
            )
        return object_key

    # Create a short-lived download URL without exposing MinIO credentials to browsers.
    @classmethod
    def presigned_image_url(cls, object_key: str) -> str:
        safe_key = cls._sanitize_relative_path(object_key)
        if not safe_key or safe_key != object_key.strip().strip("/"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
        try:
            cls.initialize()
            cls._get_client().stat_object(settings.MINIO_BUCKET, safe_key)
            return cls._get_client().presigned_get_object(
                settings.MINIO_BUCKET,
                safe_key,
                expires=timedelta(minutes=15),
            )
        except S3Error as error:
            if error.code in {"NoSuchKey", "NoSuchObject", "NoSuchBucket"}:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Image not found",
                ) from error
            logger.exception("MinIO image URL lookup failed for key %s", safe_key)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to load image",
            ) from error

    # Resolve relative and trusted legacy URLs while ignoring unrelated external hosts.
    @classmethod
    def _resolve_relative_path_from_url(cls, url: str) -> str:
        if not url:
            return ""
        parsed = urlparse(url)
        if parsed.scheme or parsed.netloc:
            trusted_url = urlparse(settings.DOMAIN_URL or "")
            if (
                parsed.scheme not in {"http", "https"}
                or not trusted_url.netloc
                or parsed.netloc.lower() != trusted_url.netloc.lower()
            ):
                return ""
        path = parsed.path.lstrip("/")
        for prefix in ("uploads/", "static/"):
            if path.startswith(prefix):
                path = path[len(prefix) :]
                break
        return cls._sanitize_relative_path(path)

    # Delete one MinIO object addressed by a compatible stored media value.
    @classmethod
    def delete_image(cls, url: str):
        object_key = cls._resolve_relative_path_from_url(url)
        if not object_key:
            return {"message": "Image path is empty or external."}
        try:
            cls.initialize()
            cls._get_client().remove_object(settings.MINIO_BUCKET, object_key)
        except Exception:
            logger.exception("MinIO image deletion failed for key %s", object_key)
            raise
        return {"message": "Image deleted successfully!"}

    # Delete exactly one blog prefix so similarly named blog folders are untouched.
    @classmethod
    def delete_key(cls, link_blog: str):
        safe_folder = cls._sanitize_relative_path(link_blog)
        if not safe_folder:
            return {"message": "Folder is already empty or does not exist."}
        prefix = f"{safe_folder}/"
        try:
            cls.initialize()
            client = cls._get_client()
            for object_info in client.list_objects(
                settings.MINIO_BUCKET, prefix=prefix, recursive=True
            ):
                client.remove_object(settings.MINIO_BUCKET, object_info.object_name)
        except Exception:
            logger.exception("MinIO prefix deletion failed for prefix %s", prefix)
            raise
        return {"message": f"Deleted all objects under {prefix}!"}
