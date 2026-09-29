from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from config.database import DatabaseManager
from config.routers import RouterManager


# Initialize tables at startup without coupling module imports to PostgreSQL.
@asynccontextmanager
async def lifespan(_: FastAPI):
    DatabaseManager().create_database_tables()
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
