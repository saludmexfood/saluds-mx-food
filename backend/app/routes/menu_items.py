from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import MenuItem
from ..security import require_admin

router = APIRouter(prefix="/menu_items", tags=["MenuItem"])

@router.get("/", summary="List all menu items")
def list_menu_items(db: Session = Depends(get_db)):
    return db.query(MenuItem).all()

@router.post("/", summary="Create a new menu item", dependencies=[Depends(require_admin)])
def create_menu_item(item_data: dict, db: Session = Depends(get_db)):
    new_item = MenuItem(**item_data)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/{item_id}", summary="Get menu item by ID")
def get_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="MenuItem not found")
    return item