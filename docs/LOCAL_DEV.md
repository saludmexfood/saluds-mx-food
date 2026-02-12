# Local Development Setup

This document describes how to run the Project Genesis admin UI and backend together for local development.

## Environment Variables

Create a file at the project root named `.env.local` with at least:

```ini
# Backend
ADMIN_PASSWORD=your_admin_password
JWT_SECRET=your_jwt_secret
DB_URL=sqlite:///./project_genesis.db

# Admin UI
NEXT_PUBLIC_API_BASE_URL=http://localhost:8010
```

## Running the Backend

1. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Start the backend server (default port 8010):
   ```bash
   uvicorn backend.app.main:app --reload --port 8010
   ```

## Running the Admin UI

1. Install dependencies:
   ```bash
   cd admin
   npm install
   ```
2. Start the Next.js development server (default port 3001):
   ```bash
   npm run dev
   ```

Requests from the Admin UI to `/api/*` will be forwarded to the backend on `http://localhost:8010` via Next.js rewrites.

## Diagnostics Banner

If API calls fail, a banner will display in the UI indicating the attempted URL and a suggestion to start the backend.

## Production Deployment

- Ensure environment variables `ADMIN_PASSWORD`, `JWT_SECRET`, and `NEXT_PUBLIC_API_BASE_URL` are set.
- Build and deploy the admin UI normally (bypass code disabled when `NODE_ENV !== "development"`).
- In production, the Admin UI will call the real backend API via the configured `NEXT_PUBLIC_API_BASE_URL`.