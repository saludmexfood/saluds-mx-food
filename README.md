# foodbiz-template

A production‐grade, demo‐first template repository for a weekly‐plates food business.

## Overview

`foodbiz-template` provides a starter boilerplate for:
- Frontend: Next.js (public site)
- Admin: Next.js (admin panel)
- Backend: FastAPI (Python)
- Database: PostgreSQL
- Storage: S3‐compatible (placeholder)
- Payments: Stripe, PayPal, Cash App (placeholders)
- Messaging: Twilio SMS, Postmark Email (placeholders)
- Social: Meta Graph API (FB + IG) with dry-run fallback
- Automations: APScheduler (MVP; upgrade path to Redis/Celery)

All copy, images, and configuration are placeholders. Demo mode (`DEMO_MODE=true`) is enabled by default.

## Prerequisites

- Docker & Docker Compose
- (Optional) Python 3.10+ for local backend development
- `jq` CLI tool (for smoke test JSON parsing)

## Getting Started

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Launch all services:
   ```bash
   # Clean previous containers and start fresh
   docker-compose down --remove-orphans
   docker-compose up --build -d
   ```
3. Backend health check:  
   ```bash
   curl -s http://localhost:${BACKEND_PORT:-8011}/health
   ```

## Port & URL

The backend container listens on port **8010** internally and is exposed on host port **8011** by default.

- Override host port with `BACKEND_PORT`:
  ```bash
  BACKEND_PORT=8012 docker-compose up --build -d
  ```
- Override base URL with `BACKEND_URL`:
  ```bash
  BACKEND_URL=http://localhost:8012 bash scripts/smoke_test_api.sh
  ```

## Demo Mode

By default, services run in **demo** mode.  
External integrations (Stripe, PayPal, SMS, Email, Social) operate in sandbox or dry-run only.

## Local Smoke Test

Prerequisites:
- Services are running via Docker Compose.
- Environment variables:
  - `ADMIN_PASSWORD` (admin login password)
  - Optional: `BACKEND_PORT`, `BACKEND_URL`

Run the smoke test script:
```bash
ADMIN_PASSWORD=your_admin_password bash scripts/smoke_test_api.sh
```

## License

MIT License