import os

from dotenv import load_dotenv

load_dotenv()

# Database
DATABASES = {
    "drivername": os.getenv("DATABASE_DRIVER"),
    "username": os.getenv("DATABASE_USERNAME"),
    "password": os.getenv("DATABASE_PASSWORD"),
    "host": os.getenv("DATABASE_HOST"),
    "database": os.getenv("DATABASE_NAME"),
    "port": int(os.getenv("DATABASE_PORT", "5432")),
}

# Standalone CMS administrator and JWT settings; secrets must stay backend-only.
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "").strip()
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH", "")
JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))

# MinIO storage used by Blog and the media upload endpoint.
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "").strip()
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "cms-media").strip()
MINIO_SECURE = os.getenv("MINIO_SECURE", "true").strip().lower() in {"1", "true", "yes"}
MINIO_REGION = os.getenv("MINIO_REGION", "").strip()
MINIO_AUTO_CREATE_BUCKET = os.getenv(
    "MINIO_AUTO_CREATE_BUCKET", "false"
).strip().lower() in {"1", "true", "yes"}
MEDIA_MAX_UPLOAD_MB = int(os.getenv("MEDIA_MAX_UPLOAD_MB", "10"))

# genimi
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL")

# Base URL
DOMAIN_URL = os.getenv("DOMAIN_URL")

AUTHOR = os.getenv("AUTHOR")

# SERP / Search references
SERP_API_KEY = os.getenv("SERP_API_KEY")
SERP_API_PROVIDER = os.getenv("SERP_API_PROVIDER", "serpapi")
SERP_RATE_LIMIT_PER_MINUTE = int(os.getenv("SERP_RATE_LIMIT_PER_MINUTE", "10"))
SERP_RATE_LIMIT_PER_DAY = int(os.getenv("SERP_RATE_LIMIT_PER_DAY", "1000"))
GOOGLE_CUSTOM_SEARCH_ENGINE_ID = os.getenv("GOOGLE_CUSTOM_SEARCH_ENGINE_ID")

# LinkedIn and Pexels credentials are server-only provider configuration.
LINKEDIN_ACCESS_TOKEN = os.getenv("LINKEDIN_ACCESS_TOKEN", "")
LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID", "")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET", "")
LINKEDIN_ORGANIZATION_URN = os.getenv("LINKEDIN_ORGANIZATION_URN", "")
LINKEDIN_VERSION = os.getenv("LINKEDIN_VERSION", "")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")

# CORS
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost").split(",")
    if origin.strip()
]
