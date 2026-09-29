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
Before using protected Blog routes or AI/reference features, set the Firebase,
Gemini, and SERP variables in `.env` with real credentials.

## Verification

```powershell
poetry run pytest
```

## Stop the local database

```powershell
docker compose down
```
