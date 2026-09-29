# Blog CMS Backend Cleanup Report

## Removed

- Course/LMS, business, expert, investment, package, and health-check backend modules.
- Account administration routes, course/event/certificate management schemas, and staff-creation helpers not used by Blog authentication.
- Unused Azure Blob helper, Azure settings, and `azure-storage-blob` dependency.
- Course/staff tests and handoff documents tied only to removed functionality.

## Preserved Blog API

- `GET /blog/client/blogs`
- `GET /blog/admin/blogs`
- `GET /blog/admin/{blog_id}`
- `GET /blog/link/{link_post}`
- `POST /blog`
- `PUT /blog/{id}`
- `DELETE /blog/{blog_id}`
- `GET /blog/is-duplicate-link-post`
- `POST /blog/ai-generate-markdown`
- `GET /blog/openai/ai-generate-list-title`
- `POST /blog/search-references`
- `POST /blog/classify-links`
- `POST /blog/fetch-content`
- `POST /media/image`
- `POST /openai/seo-keywords`
- `POST /openai/seo-description`

## Preserved Blog Features

Blog CRUD, admin/client listing, lookup by ID and `link_post`, duplicate-link checks,
related blogs, state/category/tag/SEO/banner fields, local media upload and cleanup,
Firebase authentication, staff/admin role checks, Blog scope checks, Gemini generation,
SERP reference search/classification, and content extraction remain available.

## Dependency Map

```text
Blog Router -> BlogServices -> Blog model -> SQLAlchemy/PostgreSQL
Blog Router -> AccountService -> Firebase + shared platform users table
BlogServices -> StorageService -> MEDIA_ROOT
Blog AI/OpenAI Routers -> Gemini/OpenAI client
ReferenceSearchService -> httpx + trafilatura + SERP provider
```

## Remaining Account/Auth Coupling

Blog authentication still verifies Firebase ID tokens and reads `role` and
`scopes.blog.enabled` from the shared platform `users` table. Admin bypass behavior is
preserved. Replacing this coupling is intentionally outside this cleanup.

## Environment Variables

Retained variables are documented in `.env.example`: PostgreSQL connection fields,
`MEDIA_ROOT`, Gemini settings, domain/author, CORS, SERP/search settings, and Firebase
service-account fields. Removed variables were Azure storage fields,
`STORAGE_BACKEND`, `MEDIA_BASE_URL`, and `PLATFORM_API_BASE_URL`.

## Dependencies

Removed `azure-storage-blob` and its transitive lock entries because no retained Blog
code imports `BlobService`. Added `pytest` as a development dependency so the documented
test command works in a clean Poetry environment.

## Validation Results

- `poetry check`: passed.
- `poetry install`: passed in dependency-only package mode.
- `poetry run pytest`: passed.
- `poetry run python -m compileall -q apps config`: passed.
- `poetry run python -c "from apps.main import app; print(app)"`: passed without opening
  a database connection; database initialization now occurs during FastAPI lifespan.
- Router smoke test confirms all preserved Blog/media/AI endpoints are registered and
  removed-domain endpoints are absent.
- Media smoke test confirms local upload and deletion.
- Full server startup still requires a reachable PostgreSQL instance and valid runtime
  environment values. This local review environment had no PostgreSQL service on
  `127.0.0.1:5432`.

## Final Backend Tree

```text
backend/blog/
├── apps/
│   ├── accounts/
│   ├── blogs/
│   ├── core/
│   ├── media/
│   ├── openai/
│   └── main.py
├── config/
├── tests/
├── .env.example
├── Dockerfile
├── Makefile
├── pyproject.toml
└── poetry.lock
```

## Remaining Technical Debt

- Firebase and shared platform-user coupling remains by design.
- Live CRUD and AI calls require PostgreSQL and external provider credentials; automated
  smoke tests cover importability, route preservation, auth scope behavior, and local
  media storage without inventing fake production behavior.
