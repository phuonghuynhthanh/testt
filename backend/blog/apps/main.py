from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from fastapi.responses import RedirectResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.routing import Match

from apps.core.storage import StorageService
from apps.core.errors import STATUS_MESSAGES, register_error_handlers
from apps.core.rate_limit import limiter, rate_limit_exceeded_handler
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


app = FastAPI(
    lifespan=lifespan,
    responses={
        429: {
            "description": "Too many requests",
            "headers": {
                "Retry-After": {
                    "description": "Seconds before retrying the request",
                    "schema": {"type": "integer"},
                },
            },
            "content": {
                "application/json": {
                    "schema": {"type": "object", "properties": {"detail": {"type": "string"}}},
                    "example": {"detail": STATUS_MESSAGES[429]},
                },
            },
        },
    },
)
register_error_handlers(app)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)


RouterManager(app).import_routers()


# Match only after real routes so SlowAPI middleware resolves the specific endpoint and public images stay unthrottled.
class FallbackRoute(APIRoute):
    def matches(self, scope):
        match, child_scope = super().matches(scope)
        return (Match.PARTIAL, child_scope) if match == Match.FULL else (match, child_scope)


# Serve stored media keys after every explicit API route has been registered.
def redirect_to_image(object_key: str) -> RedirectResponse:
    return RedirectResponse(StorageService.presigned_image_url(object_key))


app.router.routes.append(FallbackRoute("/{object_key:path}", redirect_to_image, methods=["GET"], include_in_schema=False))
