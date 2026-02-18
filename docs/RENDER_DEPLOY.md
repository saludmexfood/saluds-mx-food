# Render Deployment Guide

## Architecture on Render

| Service | Runtime | Root Dir | Purpose |
|---|---|---|---|
| `foodbiz-backend` | Docker | `backend/` | FastAPI API |
| `foodbiz-frontend` | Node | `frontend/` | Public Next.js site |
| `foodbiz-admin` | Node | `admin/` | Admin Next.js panel |
| `foodbiz-db` | Postgres | — | Managed Postgres DB |

---

## Step 1 — Push repo to GitHub

Make sure `render.yaml` is committed at the repo root.

```bash
git add -A && git commit -m "chore: production-ready" && git push
```

---

## Step 2 — Create Render Blueprint

1. Log in to [render.com](https://render.com).
2. **New → Blueprint**.
3. Connect your GitHub account and select the `saluds-mx-food` repo.
4. Render will read `render.yaml` and create all 4 resources (3 services + 1 database).
5. For every `sync: false` env var, Render will prompt you to enter the value before deploying.

---

## Step 3 — Set secret env vars in Render Dashboard

Set the following for the **`foodbiz-backend`** service:

| Variable | Notes |
|---|---|
| `ADMIN_PASSWORD` | Strong password for the admin panel |
| `JWT_SECRET` | Random string ≥ 32 characters |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (see below) |
| `STRIPE_SECRET_KEY` | From Stripe dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | From Stripe dashboard → Webhooks (after Step 6) |

**`ALLOWED_ORIGINS` example** (fill in your real domain):
```
https://yourdomain.com,https://www.yourdomain.com,https://admin.yourdomain.com
```

Set the following for **`foodbiz-frontend`** and **`foodbiz-admin`**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.yourdomain.com` (or the backend's `.onrender.com` URL if no custom domain yet) |

---

## Step 4 — Update `render.yaml` placeholder domains

Edit `render.yaml` and replace every `YOUR_DOMAIN` with your real domain:
- `STRIPE_SUCCESS_URL`: `https://yourdomain.com/order/success?session_id={CHECKOUT_SESSION_ID}`
- `STRIPE_CANCEL_URL`: `https://yourdomain.com/order/cancel`
- `NEXT_PUBLIC_BACKEND_URL`: `https://api.yourdomain.com`

Commit and push to trigger a re-deploy.

---

## Step 5 — Add Custom Domains on Render

In the Render dashboard, for each service → **Settings → Custom Domains**:

| Service | Domain |
|---|---|
| `foodbiz-frontend` | `yourdomain.com` and `www.yourdomain.com` |
| `foodbiz-admin` | `admin.yourdomain.com` |
| `foodbiz-backend` | `api.yourdomain.com` |

Render will show you the **DNS target values** you need for Step 6.

---

## Step 6 — GoDaddy DNS Records

Log in to GoDaddy → DNS Management for your domain.

> Replace `<target>` with the value Render shows in the custom domain settings.

### Apex / Root domain (`@`) → frontend

GoDaddy does not support CNAME on the apex. Use Render's forwarding IP:

| Type | Name | Value | TTL |
|---|---|---|---|
| `A` | `@` | `216.24.57.1` | 600 |

> **Note**: `216.24.57.1` is Render's current apex forwarding IP for GoDaddy and similar registrars.
> Render may update this — always verify at [render.com/docs/custom-domains](https://render.com/docs/custom-domains).

### `www` → frontend

| Type | Name | Value | TTL |
|---|---|---|---|
| `CNAME` | `www` | `foodbiz-frontend.onrender.com` | 600 |

### `admin` → admin panel

| Type | Name | Value | TTL |
|---|---|---|---|
| `CNAME` | `admin` | `foodbiz-admin.onrender.com` | 600 |

### `api` → backend

| Type | Name | Value | TTL |
|---|---|---|---|
| `CNAME` | `api` | `foodbiz-backend.onrender.com` | 600 |

After adding DNS records, wait up to 10 minutes, then click **Verify** in Render's custom domain settings. Render auto-provisions a free TLS certificate via Let's Encrypt.

---

## Step 7 — Stripe Webhook

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com) → Developers → Webhooks.
2. **Add endpoint**:
   - URL: `https://api.yourdomain.com/api/public/stripe/webhook`
   - Events to listen to: `checkout.session.completed`
3. After creating, reveal the **Signing secret** (`whsec_...`).
4. Paste it into the `STRIPE_WEBHOOK_SECRET` env var in the Render dashboard.
5. Trigger a redeploy of `foodbiz-backend`.

---

## Copy-Paste Deploy Checklist

```
[ ] 1. Secrets committed to .env (local only, gitignored)
[ ] 2. render.yaml updated with real domain names
[ ] 3. Code pushed to GitHub main branch
[ ] 4. Render Blueprint connected to GitHub repo
[ ] 5. Backend env vars set in Render dashboard:
        ADMIN_PASSWORD, JWT_SECRET, ALLOWED_ORIGINS
        STRIPE_SECRET_KEY (can add after Stripe webhook created)
        STRIPE_WEBHOOK_SECRET (add after Step 7)
[ ] 6. Frontend + Admin NEXT_PUBLIC_BACKEND_URL set in Render
[ ] 7. All 3 services deployed successfully (green health check)
[ ] 8. Custom domains added in Render for all 3 services
[ ] 9. GoDaddy DNS records added (A @, CNAME www/admin/api)
[ ] 10. DNS verified in Render (TLS cert issued — green padlock)
[ ] 11. Stripe webhook endpoint created pointing to /api/public/stripe/webhook
[ ] 12. STRIPE_WEBHOOK_SECRET copied from Stripe → Render backend env
[ ] 13. Backend redeployed after Step 12
[ ] 14. End-to-end test: add item to cart → Stripe checkout → verify order marked PAID
```

---

## Troubleshooting

**Backend 500 on first deploy**: Check that `DATABASE_URL` is linked from the Render Postgres. Look at backend logs — it should print `"FoodBiz API"` on startup.

**CORS errors in browser**: Make sure `ALLOWED_ORIGINS` includes the exact origin (including `https://` and no trailing slash).

**Stripe webhook 400**: Ensure raw body is not modified by any middleware. The webhook handler reads raw bytes — FastAPI handles this correctly via `Request.body()`.

**GoDaddy propagation slow**: DNS changes can take up to 48 hours globally, but usually complete in minutes. Use [dnschecker.org](https://dnschecker.org) to check propagation.
