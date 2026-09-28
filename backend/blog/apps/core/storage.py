import os
import shutil
import uuid
from pathlib import Path
from urllib.parse import urlparse

from fastapi import UploadFile

from config import settings


class StorageService:
    @staticmethod
    def _sanitize_relative_path(path: str) -> str:
        normalized = path.strip().strip("/")
        parts = [part for part in normalized.split("/") if part not in ("", ".", "..")]
        return "/".join(parts)

    @classmethod
    def _ensure_media_root(cls) -> Path:
        media_root = Path(settings.MEDIA_ROOT)
        media_root.mkdir(parents=True, exist_ok=True)
        return media_root

    @classmethod
    def upload_image(cls, image_file: UploadFile, folder: str = ""):
        extension = Path(image_file.filename or "").suffix.lower() or ".bin"
        image_name = f"{uuid.uuid4()}{extension}"
        safe_folder = cls._sanitize_relative_path(folder)
        relative_path = f"{safe_folder}/{image_name}".strip("/") if safe_folder else image_name

        media_root = cls._ensure_media_root()
        output_path = media_root / relative_path
        output_path.parent.mkdir(parents=True, exist_ok=True)

        image_file.file.seek(0)
        with output_path.open("wb") as out_file:
            shutil.copyfileobj(image_file.file, out_file)

        # Store only file key/name in DB. FE will build full URL.
        return relative_path

    @classmethod
    def _resolve_relative_path_from_url(cls, url: str) -> str:
        # Backward compatibility:
        # - old values may be full URLs
        # - new values are file key/name only
        parsed = urlparse(url)
        path = parsed.path if parsed.path else url
        path = path.lstrip("/")
        if path.startswith("uploads/"):
            path = path[len("uploads/") :]
        if path.startswith("static/"):
            path = path[len("static/") :]
        return cls._sanitize_relative_path(path)

    @classmethod
    def delete_image(cls, url: str):
        relative_path = cls._resolve_relative_path_from_url(url)
        if not relative_path:
            return {"message": "Image path is empty."}

        media_root = cls._ensure_media_root()
        target = media_root / relative_path
        if target.exists() and target.is_file():
            target.unlink()
            return {"message": "Image deleted successfully!"}
        return {"message": "Image does not exist."}

    @classmethod
    def delete_key(cls, link_blog: str):
        safe_folder = cls._sanitize_relative_path(link_blog)
        if not safe_folder:
            return {"message": "Folder is already empty or does not exist."}

        media_root = cls._ensure_media_root()
        folder_path = media_root / safe_folder
        if not folder_path.exists() or not folder_path.is_dir():
            return {"message": "Folder is already empty or does not exist."}

        for root, _, files in os.walk(folder_path, topdown=False):
            for file_name in files:
                Path(root, file_name).unlink(missing_ok=True)
            if Path(root) != folder_path:
                Path(root).rmdir()

        folder_path.rmdir()
        return {"message": f"Deleted all objects under {safe_folder}/!"}
