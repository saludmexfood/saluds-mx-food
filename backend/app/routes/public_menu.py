from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import MenuWeek
from ..schemas import MenuWeekRead

router = APIRouter(prefix="/api/public/menu", tags=["Public Menu"])

@router.get("/", response_model=Optional[MenuWeekRead])
def get_current_menu(db: Session = Depends(get_db)):
    """
    Return the most recent published MenuWeek with its active items.
    If none is published, return null.
    """
    week = (
        db.query(MenuWeek)
        .filter(MenuWeek.published == True)
        .order_by(MenuWeek.starts_at.desc())
        .first()
    )
    if not week:
        return None
    return week
