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

# Local media storage used by Blog and the media upload endpoint.
MEDIA_ROOT = os.getenv("MEDIA_ROOT", "/opt/quantvn/backend/uploads")

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

# CORS
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost").split(",")
    if origin.strip()
]
