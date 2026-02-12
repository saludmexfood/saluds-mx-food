from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


# Shared properties
class MenuItemBase(BaseModel):
    menu_week_id: int
    name: str
    description: str
    price_cents: int
    qty_limit: Optional[int] = None
    qty_sold: int = 0
    is_sold_out: bool = False
    is_active: bool = True


class MenuWeekBase(BaseModel):
    week_start_date: date
    is_published: bool = False
    pickup_window_text: str
    notes_text: str


# Input schemas
class MenuWeekCreate(MenuWeekBase):
    pass


class MenuItemCreate(MenuItemBase):
    pass


class MenuWeekUpdate(BaseModel):
    is_published: bool


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_cents: Optional[int] = None
    qty_limit: Optional[int] = None
    is_sold_out: Optional[bool] = None
    is_active: Optional[bool] = None


# Response schemas
class MenuItemRead(MenuItemBase):
    id: int

    class Config:
        from_attributes = True


class MenuWeekRead(MenuWeekBase):
    id: int
    created_at: datetime
    items: List[MenuItemRead] = []

    class Config:
        from_attributes = True