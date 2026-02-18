# FoodBiz — Weekly Plates Ordering Platform

A production-grade template for a weekly-plates food business.

## Architecture

| Layer | Tech | Port (local) |
|---|---|---|
| Frontend | Next.js | 3000 |
| Admin | Next.js | 3001 |
| Backend | FastAPI (Python 3.10) | 8010 |
| Database | PostgreSQL 14 | 5433 (host) |

## Prerequisites

- Docker & Docker Compose v2
- `jq` (for smoke tests): `brew install jq`
- Node 18+ (for local frontend/admin dev without Docker)

## Local Quick-Start

```bash
# 1. Copy env template
cp .env.example .env

# 2. Start backend + database
docker-compose down --remove-orphans
docker-compose up --build -d

# 3. Verify backend is healthy
curl -s http://localhost:8010/health
# → {"status":"ok","demo_mode":true}
```

## Frontend / Admin (local dev, outside Docker)

```bash
# Frontend (port 3000)
cd frontend && npm install && npm run dev

# Admin (port 3001)
cd admin && npm install && npm run dev
```

Set `NEXT_PUBLIC_BACKEND_URL=http://localhost:8010` in your shell or `.env` file.
Both apps read this variable to know where the backend is.

## Key API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Health check |
| GET | `/api/public/menu/` | — | Current published menu |
| POST | `/api/public/orders/` | — | Create order |
| POST | `/api/public/checkout/session` | — | Create Stripe Checkout session |
| POST | `/api/public/stripe/webhook` | Stripe sig | Mark order paid |
| POST | `/admin/auth/login` | — | Get JWT token |
| GET | `/admin/menu/weeks/` | JWT | List menu weeks |
| POST | `/admin/menu/weeks/` | JWT | Create menu week |
| POST | `/admin/menu/items/` | JWT | Create menu item |
| PATCH | `/admin/menu/weeks/{id}` | JWT | Publish/unpublish week |

Full OpenAPI docs: `http://localhost:8010/docs`

## Smoke Test

```bash
ADMIN_PASSWORD=dev_admin_password_change_me bash scripts/smoke_test_api.sh
```

Expected: `🎉 API smoke test PASS` and exit code 0.

## Environment Variables

See `.env.example` for all variables with comments.

Key variables:
- `DB_URL` / `DATABASE_URL` — PostgreSQL connection string (Render injects `DATABASE_URL` automatically)
- `ADMIN_PASSWORD` — admin panel password
- `JWT_SECRET` — ≥ 32 chars in production
- `ALLOWED_ORIGINS` — comma-separated CORS origins (empty = localhost only)
- `RESET_DB_ON_STARTUP` — `true` drops + recreates tables (dev only!)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe keys

## Production Deployment (Render)

See [`docs/RENDER_DEPLOY.md`](docs/RENDER_DEPLOY.md) for:
- Render Blueprint setup from GitHub
- Custom domain setup (apex + subdomains)
- GoDaddy DNS records
- Stripe webhook configuration
- Copy-paste deploy checklist

## Demo Mode

`DEMO_MODE=true` (default) is a flag for the frontend to show demo banners.
It does **not** disable any functionality.

## License

MIT
