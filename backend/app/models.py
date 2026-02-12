from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, DateTime, func
from .db import Base
from sqlalchemy.orm import relationship

class SampleModel(Base):
    __tablename__ = "sample"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, default="Placeholder description")


class MenuWeek(Base):
    __tablename__ = "menu_weeks"
    id = Column(Integer, primary_key=True, index=True)
    week_start_date = Column(Date, nullable=False)
    is_published = Column(Boolean, default=False)
    pickup_window_text = Column(String, default="[PLACEHOLDER]")
    notes_text = Column(String, default="[PLACEHOLDER]")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    items = relationship("MenuItem", back_populates="week")


class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(Integer, primary_key=True, index=True)
    menu_week_id = Column(Integer, ForeignKey("menu_weeks.id"))
    name = Column(String, default="[PLACEHOLDER]")
    description = Column(String, default="[PLACEHOLDER]")
    price_cents = Column(Integer, default=0)
    qty_limit = Column(Integer, nullable=True)
    qty_sold = Column(Integer, default=0)
    is_sold_out = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    week = relationship("MenuWeek", back_populates="items")
