from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.core.storage import StorageService
from apps.publications.migrations import apply as apply_publication_migration
from config import settings
from config.database import DatabaseManager
from config.routers import RouterManager


# Initialize tables at startup without coupling module imports to PostgreSQL.
@asynccontextmanager
async def lifespan(_: FastAPI):
    # Fail at startup if MinIO cannot be reached or its bucket is unavailable.
    StorageService.initialize()
    DatabaseManager().create_database_tables()
    # Upgrade publication columns and backfill legacy Blogs before serving requests.
    apply_publication_migration(DatabaseManager.engine)
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


RouterManager(app).import_routers()
