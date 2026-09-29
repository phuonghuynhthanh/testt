# QuantVN Blog CMS API

## Local startup

Prerequisites: Docker Desktop, Python 3.12, and Poetry.

```powershell
cd D:\intern\Quant-VN\backend\blog
docker compose up -d
Copy-Item .env.example .env
$env:POETRY_VIRTUALENVS_IN_PROJECT = "true"
poetry install --no-interaction
poetry run uvicorn apps.main:app --host 0.0.0.0 --port 8001 --reload
```

Open the API documentation at http://localhost:8001/docs.

The local Compose stack also starts MinIO at `localhost:9000`; its console is
available at http://localhost:9001. The development credentials in `.env.example`
are only for this local stack. The backend creates `cms-media` at startup because
`MINIO_AUTO_CREATE_BUCKET=true`; use private production credentials, TLS, and
`MINIO_AUTO_CREATE_BUCKET=false` outside local development.

The default `.env.example` values match the included local PostgreSQL container.
Before using protected routes, configure `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`,
and `JWT_SECRET` in `.env`; these values must never be placed in the frontend.
Generate a password hash locally with:

```powershell
poetry run python -c "from pwdlib import PasswordHash; print(PasswordHash.recommended().hash('replace-with-a-password'))"
```

Generate a 32+ character JWT secret locally with:

```powershell
poetry run python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Log in through `POST /auth/login` with JSON `{ "username": "...", "password": "..." }`.
Use the returned token as `Authorization: Bearer <access_token>` for CMS APIs.
Configure Gemini and SERP variables as needed for AI/reference features.

## Verification

```powershell
poetry run pytest
```

## Stop the local stack

```powershell
docker compose down
```
workflow 
                    CMS Post
                       │
            ┌──────────┴──────────┐
            │                     │
          WEB                 LINKEDIN
            │                     │
       selected?              selected?
            │                     │
           yes                   yes
            │                     │
   save/publish Blog       choose content mode
            │                     │
            │              ┌──────┼──────┐
            │              │      │      │
            │            SAME  SUMMARY CUSTOM
            │                     │
            │                  AI adapt
            │                     │
            ▼                     ▼
 canonical web URL      admin preview/edit
            │                     │
            └──────────────┐      │
                           ▼      ▼
                    append web link
                           │
                           ▼
                    LinkedIn Publish
                           │
                           ▼
                   save LinkedIn postId