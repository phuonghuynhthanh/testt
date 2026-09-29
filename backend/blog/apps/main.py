from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from config.database import DatabaseManager
from config.routers import RouterManager


# Initialize tables at startup without coupling module imports to PostgreSQL.
@asynccontextmanager
async def lifespan(_: FastAPI):
    DatabaseManager().create_database_tables()
    yield


app = FastAPI(lifespan=lifespan)

# Serve locally stored Blog images through the URL used by the admin client.
app.mount(
    "/static", StaticFiles(directory=settings.MEDIA_ROOT, check_dir=False), name="static"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


RouterManager(app).import_routers()
