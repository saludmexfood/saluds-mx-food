from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import MenuWeek
from ..schemas import MenuWeekRead

router = APIRouter(prefix="/public/menu", tags=["Public Menu"])

@router.get("/current", response_model=Optional[MenuWeekRead])
def get_current_menu(db: Session = Depends(get_db)):
    """
    Return the most recent published MenuWeek with its active items.
    If none is published, return an empty JSON object.
    """
    week = (
        db.query(MenuWeek)
        .filter(MenuWeek.is_published == True)
        .order_by(MenuWeek.week_start_date.desc())
        .first()
    )
    if not week:
        return None
    # Validate and serialize ORM model to Pydantic schema
    return MenuWeekRead.model_validate(week)
