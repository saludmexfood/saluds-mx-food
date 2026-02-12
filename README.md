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

## Getting Started

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Launch all services:
   ```bash
   docker-compose up --build
   ```
3. Backend health check:  
   `http://localhost:8000/health`

## Repository Structure

```
/
├── frontend      # Next.js public site
├── admin         # Next.js admin panel
├── backend       # FastAPI backend
├── docs          # Documentation and design tokens
├── .env.example
├── docker-compose.yml
└── README.md
```

## Demo Mode

By default, services run in **demo** mode.  
External integrations (Stripe, PayPal, SMS, Email, Social) operate in sandbox or dry-run only.

## License

MIT License