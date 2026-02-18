from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import MenuWeek
from ..schemas import MenuWeekCreate, MenuWeekRead, MenuWeekUpdate
from ..security import require_admin

router = APIRouter(
    prefix="/admin/menu/weeks",
    tags=["Admin MenuWeek"],
    dependencies=[Depends(require_admin)],
)


@router.get("/", response_model=List[MenuWeekRead])
def list_admin_menu_weeks(db: Session = Depends(get_db)):
    """List all menu weeks, including unpublished."""
    return db.query(MenuWeek).order_by(MenuWeek.starts_at.desc()).all()


@router.post(
    "/", response_model=MenuWeekRead, status_code=status.HTTP_201_CREATED
)
def create_admin_menu_week(
    payload: MenuWeekCreate, db: Session = Depends(get_db)
):
    """Create a new menu week."""
    week = MenuWeek(**payload.dict())
    db.add(week)
    db.commit()
    db.refresh(week)
    return week


@router.patch("/{week_id}", response_model=MenuWeekRead)
def update_admin_menu_week(
    week_id: int, payload: MenuWeekUpdate, db: Session = Depends(get_db)
):
    """Publish or unpublish a menu week."""
    week = db.query(MenuWeek).get(week_id)
    if not week:
        raise HTTPException(status_code=404, detail="MenuWeek not found")
    week.published = payload.published
    db.commit()
    db.refresh(week)
    return week