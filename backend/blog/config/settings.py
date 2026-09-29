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

# Firebase (server credentials) — same project as platform
FIREBASE_SERVER_CREDENTIALS = {
    "type": os.getenv("FIREBASE_TYPE"),
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
    "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "client_id": os.getenv("FIREBASE_CLIENT_ID"),
    "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
    "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
    "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_CERT_URL"),
    "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_CERT_URL"),
    "universe_domain": os.getenv("FIREBASE_UNIVERSE_DOMAIN"),
}

# Roles allowed to call blog admin APIs (must match platform UserRole)
BLOG_ALLOWED_ROLES = {"staff", "admin"}

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
