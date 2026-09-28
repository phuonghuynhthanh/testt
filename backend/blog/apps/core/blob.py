import uuid
from fastapi import UploadFile
from config import settings
from azure.storage.blob import BlobServiceClient

class BlobService:
    blob_service_client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)

    @classmethod
    def upload_image(cls, image_file: UploadFile, folder: str = ""):
        image_name = uuid.uuid4()
        file_type = image_file.filename.split(".")
        folder_path = f"{folder}/{image_name}.{file_type[len(file_type) - 1]}".strip("/")

        blob_client = cls.blob_service_client.get_blob_client(
            container=settings.AZURE_STORAGE_CONTAINER_NAME, 
            blob=folder_path
        )
        blob_client.upload_blob(data=image_file.file, content_type=image_file.content_type)

        return f"{settings.AZURE_FRONT_DOOR}/{folder_path}"

    @classmethod
    def delete_image(cls, url: str):
        image_name = url.split("/")[-1]
        blob_client = cls.blob_service_client.get_blob_client(
            container=settings.AZURE_STORAGE_CONTAINER_NAME,
            blob=image_name
        )
        blob_client.delete_blob()
        return {"message": "Image deleted successfully!"}
    
    @classmethod
    def delete_key(cls, link_blog: str):
        container_client = cls.blob_service_client.get_container_client(settings.AZURE_STORAGE_CONTAINER_NAME)
        
        prefix = f"{link_blog}/"
        blobs = container_client.list_blobs(name_starts_with=prefix)
        blobs_list = list(blobs)
        if not blobs_list:
            return {"message": "Folder is already empty or does not exist."}
        
        for blob in blobs_list:
            blob_client = container_client.get_blob_client(blob.name)
            blob_client.delete_blob()
        
        return {"message": f"Deleted all objects under {prefix}!"}