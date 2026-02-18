import os
from pydantic import BaseSettings


class Settings(BaseSettings):
    DEMO_MODE: bool = True
    ADMIN_PASSWORD: str = "[PLACEHOLDER]"
    JWT_SECRET: str = "[PLACEHOLDER]"
    DB_URL: str = "sqlite:///./project_genesis.db"
    ALLOWED_ORIGINS: list[str] = ["*"]

    @property
    def DATABASE_URL(self) -> str:
        return self.DB_URL


settings = Settings()

# Production-time validation
if os.getenv("NODE_ENV") == "production":
    secret = settings.JWT_SECRET
    if not secret or len(secret) < 32:
        raise ValueError(
            "In production NODE_ENV, JWT_SECRET must be set and at least 32 characters long."
        )