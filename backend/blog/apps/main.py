from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from config.database import DatabaseManager
from config.routers import RouterManager

app = FastAPI()

DatabaseManager().create_database_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


RouterManager(app).import_routers()
