from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .config import settings
from .db import engine, Base
from .db_migrations import ensure_legacy_compat_columns
from .routes.public_menu import router as public_menu_router
from .routes.public_orders import router as public_orders_router
from .routes.public_stripe import router as public_stripe_router
from .routes.admin_auth import router as admin_auth_router
from .routes.admin_menu_weeks import router as admin_menu_weeks_router
from .routes.admin_menu_items import router as admin_menu_items_router
from .routes.admin_orders import router as admin_orders_router
from .routes.admin_menu import router as admin_menu_router
from .routes.queue import router as queue_router

app = FastAPI(title="FoodBiz API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=Path(__file__).resolve().parent / "static"), name="static")


@app.on_event("startup")
def on_startup():
    if settings.RESET_DB_ON_STARTUP:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    ensure_legacy_compat_columns(engine)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "demo_mode": settings.DEMO_MODE}


# Public endpoints
app.include_router(public_menu_router)
app.include_router(public_orders_router)
app.include_router(public_stripe_router)

# Admin endpoints
app.include_router(admin_auth_router)
app.include_router(admin_menu_weeks_router)
app.include_router(admin_menu_items_router)
app.include_router(admin_orders_router)
app.include_router(admin_menu_router)

# Queue and other internal APIs
app.include_router(queue_router, prefix="/api")
