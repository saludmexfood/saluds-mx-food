from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum, func
from .db import Base
from sqlalchemy.orm import relationship
import enum

class WeekStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class MenuWeek(Base):
    __tablename__ = "menu_weeks"
    id = Column(Integer, primary_key=True, index=True)
    selling_days = Column(String, nullable=False)  # e.g., "Mon,Wed,Fri"
    status = Column(Enum(WeekStatus), default=WeekStatus.OPEN, nullable=False)
    published = Column(Boolean, default=False, nullable=False)
    starts_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    items = relationship("MenuItem", back_populates="week")


class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, index=True)
    menu_week_id = Column(Integer, ForeignKey("menu_weeks.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    photo_url = Column(String, nullable=True)
    price_cents = Column(Integer, nullable=False)
    available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    week = relationship("MenuWeek", back_populates="items")


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=True, unique=True)
    sms_opt_in = Column(Boolean, default=False, nullable=False)
    email_opt_in = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    orders = relationship("Order", back_populates="customer")


class OrderStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    pickup_or_delivery = Column(String, nullable=False)  # "pickup" or "delivery"
    delivery_fee_cents = Column(Integer, default=0, nullable=False)
    delivery_address = Column(String, nullable=True)
    comment = Column(String, nullable=True)
    total_cents = Column(Integer, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    qty = Column(Integer, nullable=False)
    line_total_cents = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")