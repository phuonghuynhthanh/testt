# Dev vs Production

| | Backend (`backend/blog`) | Frontend (`admin`) |
|---|---|---|
| Dev | `.env` + `compose.yaml` (postgres/minio only), `make run` | `.env.development`, `npm run dev` |
| Prod | `.env.production` + `compose.prod.yaml` (api + postgres + minio) | `.env.production`, `npm run build` |
| Templates (committed) | `.env.example`, `.env.production.example` | `.env.production.example` |

Real `.env*` files are git-ignored. Quote `ADMIN_PASSWORD_HASH` with single quotes (it contains `$`).

## Run production locally
```bash
cd backend/blog
docker compose -p quantvn --env-file .env.production -f compose.prod.yaml up -d --build
# API: http://127.0.0.1:8010/docs   (bound to loopback only)

cd ../../admin
npm run build && npm run preview     # http://localhost:4173
```
Stop (keeps data): `docker compose -p quantvn --env-file .env.production -f compose.prod.yaml down`
(never add `-v` unless you want to wipe the DB and media).

## Real server
- Backend: copy `.env.production.example` to `.env.production`, fill real secrets, set `ALLOWED_ORIGINS` to the frontend
  origin and `RATE_LIMIT_TRUST_PROXY=true` (only behind Nginx). Pick a free `API_HOST_PORT` on a shared VPS.
- Frontend: set `admin/.env.production` to the public API URL, `npm run build`, upload the contents of `dist/`
  (including `.htaccess`) to Hostinger `public_html`.
