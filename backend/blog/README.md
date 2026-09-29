# QuantVN Blog CMS API

## Local startup

Prerequisites: Docker Desktop, Python 3.12, and Poetry.

```powershell
cd D:\intern\Quant-VN\backend\blog
docker compose up -d postgres
Copy-Item .env.example .env
$env:POETRY_VIRTUALENVS_IN_PROJECT = "true"
poetry install --no-interaction
poetry run uvicorn apps.main:app --host 0.0.0.0 --port 8001 --reload
```

Open the API documentation at http://localhost:8001/docs.

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

## Stop the local database

```powershell
docker compose down
```
