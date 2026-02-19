from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import MenuItem
from ..schemas import MenuItemCreate, MenuItemRead, MenuItemUpdate
from ..security import require_admin

router = APIRouter(
    prefix="/admin/menu/items",
    tags=["Admin MenuItem"],
    dependencies=[Depends(require_admin)],
)


@router.get("/", response_model=List[MenuItemRead])
def list_admin_menu_items(db: Session = Depends(get_db)):
    """List all menu items."""
    return db.query(MenuItem).order_by(MenuItem.id).all()


@router.post("/", response_model=MenuItemRead, status_code=status.HTTP_201_CREATED)
def create_admin_menu_item(
    payload: MenuItemCreate, db: Session = Depends(get_db)
):
    """Create a new menu item."""
    item = MenuItem(**payload.dict())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/weeks/{week_id}/items", response_model=List[MenuItemRead])
def list_menu_items_by_week(week_id: int, db: Session = Depends(get_db)):
    """List items for a given week."""
    return db.query(MenuItem).filter(MenuItem.menu_week_id == week_id).order_by(MenuItem.id).all()


@router.patch("/{item_id}", response_model=MenuItemRead)
def update_admin_menu_item(
    item_id: int, payload: MenuItemUpdate, db: Session = Depends(get_db)
):
    """Update fields of an existing menu item."""
    item = db.query(MenuItem).get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="MenuItem not found")
    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item
