from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .db import SessionLocal, engine, Base
from .models import MenuWeek, MenuItem, Customer, Order, OrderItem
from .routes.public_menu import router as public_menu_router
from .routes.public_orders import router as public_orders_router
from .routes.admin_auth import router as admin_auth_router
from .routes.admin_menu_weeks import router as admin_menu_weeks_router
from .routes.admin_menu_items import router as admin_menu_items_router
from .routes.admin_orders import router as admin_orders_router
from .routes.admin_menu import router as admin_menu_router
from .routes.queue import router as queue_router
from sqlalchemy.orm import Session

app = FastAPI(title="FoodBiz API", debug=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # Drop and recreate all tables to ensure schema matches models
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "demo_mode": settings.DEMO_MODE}

# Public endpoints
app.include_router(public_menu_router)
app.include_router(public_orders_router)

# Admin endpoints
app.include_router(admin_auth_router)
app.include_router(admin_menu_weeks_router)
app.include_router(admin_menu_items_router)
app.include_router(admin_orders_router)
app.include_router(admin_menu_router)

# Queue and other internal APIs
app.include_router(queue_router, prefix="/api")