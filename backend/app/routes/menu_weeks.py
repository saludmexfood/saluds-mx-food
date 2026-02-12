from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import MenuWeek
from ..security import require_admin

router = APIRouter(prefix="/menu_weeks", tags=["MenuWeek"])

@router.get("/", summary="List all menu weeks")
def list_menu_weeks(db: Session = Depends(get_db)):
    return db.query(MenuWeek).all()

@router.post("/", summary="Create a new menu week", dependencies=[Depends(require_admin)])
def create_menu_week(week_data: dict, db: Session = Depends(get_db)):
    new_week = MenuWeek(**week_data)
    db.add(new_week)
    db.commit()
    db.refresh(new_week)
    return new_week

@router.get("/{week_id}", summary="Get menu week by ID")
def get_menu_week(week_id: int, db: Session = Depends(get_db)):
    week = db.query(MenuWeek).get(week_id)
    if not week:
        raise HTTPException(status_code=404, detail="MenuWeek not found")
    return week