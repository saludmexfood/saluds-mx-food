from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel
import enum


class WeekStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    PAID = "PAID"


class MenuItemBase(BaseModel):
    menu_week_id: int
    name: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    price_cents: int
    available: bool = True


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemRead(MenuItemBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    photo_url: Optional[str] = None
    price_cents: Optional[int] = None
    available: Optional[bool] = None


class MenuWeekBase(BaseModel):
    selling_days: str
    status: WeekStatus = WeekStatus.OPEN
    published: bool = False
    starts_at: datetime


class MenuWeekCreate(MenuWeekBase):
    pass


class MenuWeekRead(MenuWeekBase):
    id: int
    created_at: datetime
    items: List[MenuItemRead] = []

    class Config:
        orm_mode = True


class MenuWeekUpdate(BaseModel):
    selling_days: Optional[str] = None
    status: Optional[WeekStatus] = None
    published: Optional[bool] = None
    starts_at: Optional[datetime] = None


class CustomerBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    additional_phones: List[str] = []
    additional_emails: List[str] = []
    sms_opt_in: bool = False
    email_opt_in: bool = False


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    additional_phones: Optional[List[str]] = None
    additional_emails: Optional[List[str]] = None
    sms_opt_in: Optional[bool] = None
    email_opt_in: Optional[bool] = None


class CustomerRead(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class OrderItemBase(BaseModel):
    menu_item_id: int
    qty: int
    line_total_cents: int


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemRead(OrderItemBase):
    id: int

    class Config:
        orm_mode = True


class OrderBase(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    pickup_or_delivery: str
    delivery_fee_cents: int = 0
    delivery_address: Optional[str] = None
    comment: Optional[str] = None
    total_cents: int


class OrderCreate(OrderBase):
    items: List[OrderItemCreate]


class OrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    pickup_or_delivery: Optional[str] = None
    delivery_fee_cents: Optional[int] = None
    delivery_address: Optional[str] = None
    comment: Optional[str] = None
    status: Optional[OrderStatus] = None
    price_adjustment_cents: Optional[int] = 0
    items: Optional[List[OrderItemCreate]] = None


class OrderRead(OrderBase):
    id: int
    status: OrderStatus
    stripe_session_id: Optional[str] = None
    payment_intent_id: Optional[str] = None
    created_at: datetime
    items: List[OrderItemRead] = []

    class Config:
        orm_mode = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class ItemCount(BaseModel):
    menu_item_id: int
    total_qty: int


class SpecialRequest(BaseModel):
    order_id: int
    comment: str


class DeliveryInfo(BaseModel):
    order_id: int
    name: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    comment: Optional[str]


class OrdersTally(BaseModel):
    total_orders: int
    total_pickup_orders: int
    total_delivery_orders: int
    item_counts: List[ItemCount]
    special_requests: List[SpecialRequest]
    delivery_list: List[DeliveryInfo]


class SiteSettingsRead(BaseModel):
    data: dict[str, Any]


class SiteSettingsUpdate(BaseModel):
    data: dict[str, Any]
