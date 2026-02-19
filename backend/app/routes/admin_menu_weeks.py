from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import MenuItem, MenuWeek
from ..schemas import MenuItemRead, MenuWeekCreate, MenuWeekRead, MenuWeekUpdate
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
    week.week_start_date = payload.starts_at
    week.is_published = payload.published
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
    if payload.selling_days is not None:
        week.selling_days = payload.selling_days
    if payload.status is not None:
        week.status = payload.status
    if payload.starts_at is not None:
        week.starts_at = payload.starts_at
        week.week_start_date = payload.starts_at
    if payload.published is not None:
        week.published = payload.published
        week.is_published = payload.published
    db.commit()
    db.refresh(week)
    return week

@router.get("/{week_id}/items", response_model=List[MenuItemRead])
def list_admin_menu_week_items(week_id: int, db: Session = Depends(get_db)):
    """List items for a given menu week (alias for admin UI compatibility)."""
    return db.query(MenuItem).filter(MenuItem.menu_week_id == week_id).order_by(MenuItem.id).all()
