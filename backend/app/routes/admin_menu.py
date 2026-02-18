from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import MenuWeek
from ..schemas import MenuWeekCreate, MenuWeekRead
from ..security import require_admin

router = APIRouter(
    prefix="/api/admin/menu",
    tags=["Admin Menu"],
    dependencies=[Depends(require_admin)],
)


@router.get("/", response_model=List[MenuWeekRead])
def get_admin_menu(db: Session = Depends(get_db)):
    """Retrieve all menu weeks and items for admin."""
    return db.query(MenuWeek).order_by(MenuWeek.starts_at.desc()).all()


@router.post("/week", response_model=MenuWeekRead)
def upsert_menu_week(payload: MenuWeekCreate, db: Session = Depends(get_db)):
    """
    Create a new menu week or update an existing one.
    """
    week = MenuWeek(**payload.model_dump())
    db.add(week)
    db.commit()
    db.refresh(week)
    return week