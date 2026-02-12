from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .config import settings
from .db import SessionLocal, engine, Base
from .models import SampleModel
from .routes.menu_weeks import router as menu_weeks_router
from .routes.menu_items import router as menu_items_router
from .routes.public_menu import router as public_menu_router
from .routes.admin_menu_weeks import router as admin_menu_weeks_router
from .routes.admin_menu_items import router as admin_menu_items_router
from .routes.admin_auth import router as admin_auth_router
from .routes.queue import router as queue_router

app = FastAPI(title="FoodBiz API", debug=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    # Create database tables
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

@app.get("/sample/{item_id}", tags=["Sample"])
def read_sample(item_id: int, db: Session = Depends(get_db)):
    item = db.query(SampleModel).filter(SampleModel.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"id": item.id, "name": item.name, "description": item.description}

app.include_router(menu_weeks_router)
app.include_router(menu_items_router)
app.include_router(public_menu_router)
app.include_router(admin_menu_weeks_router)
app.include_router(admin_menu_items_router)
app.include_router(admin_auth_router)
app.include_router(queue_router, prefix="/api")
