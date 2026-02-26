import os
from pydantic import BaseSettings


class Settings(BaseSettings):
    DEMO_MODE: bool = True
    ADMIN_PASSWORD: str = ""
    JWT_SECRET: str = ""

    # DB_URL is the primary config key.
    # On Render, the managed Postgres service injects DATABASE_URL automatically.
    # pydantic v1 BaseSettings will read the first matching env var in order.
    DB_URL: str = "sqlite:///./project_genesis.db"

    # Comma-separated allowed CORS origins.
    # Leave empty to allow only localhost:3000 + localhost:3001 (dev default).
    # In production set to: "https://yourdomain.com,https://www.yourdomain.com,https://admin.yourdomain.com"
    ALLOWED_ORIGINS: str = ""

    # Set to true ONLY in dev/CI to drop and recreate tables on startup.
    # NEVER set to true in production.
    RESET_DB_ON_STARTUP: bool = False

    # Set to true in demo/dev to seed a starter menu when DB has no menu data.
    # Seeding is skipped automatically if existing menu data is present.
    SEED_DEMO_DATA: bool = False

    # Stripe — leave empty to run without Stripe (checkout endpoints will return 503)
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_SUCCESS_URL: str = (
        "http://localhost:3000/order/success?session_id={CHECKOUT_SESSION_ID}"
    )
    STRIPE_CANCEL_URL: str = "http://localhost:3000/order/cancel"

    class Config:
        # Allow DB_URL to also be satisfied by the Render-injected DATABASE_URL env var
        fields = {
            "DB_URL": {"env": ["DB_URL", "DATABASE_URL"]},
        }

    @property
    def DATABASE_URL(self) -> str:
        return self.DB_URL

    @property
    def allowed_origins_list(self) -> list:
        raw = self.ALLOWED_ORIGINS.strip()
        if not raw:
            return ["http://localhost:3000", "http://localhost:3001"]
        return [o.strip() for o in raw.split(",") if o.strip()]


settings = Settings()

# Production-time validation
if os.getenv("NODE_ENV") == "production":
    secret = settings.JWT_SECRET
    if not secret or len(secret) < 32:
        raise ValueError(
            "In production NODE_ENV, JWT_SECRET must be set and at least 32 characters long."
        )
