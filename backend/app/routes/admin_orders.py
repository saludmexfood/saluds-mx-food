from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db import get_db
from ..models import Order, OrderItem, Customer
from ..schemas import OrderRead, OrderStatusUpdate, OrdersTally
from ..security import require_admin

router = APIRouter(
    prefix="/api/admin/orders",
    tags=["Admin Orders"],
    dependencies=[Depends(require_admin)],
)

@router.get("/", response_model=List[OrderRead])
def list_admin_orders(db: Session = Depends(get_db)):
    """List all orders."""
    return db.query(Order).order_by(Order.created_at.desc()).all()

@router.get("/tally", response_model=OrdersTally)
def tally_orders(db: Session = Depends(get_db)):
    """Aggregate order counts, item tallies, special requests, and delivery list."""
    total_orders = db.query(Order).count()
    total_pickup_orders = db.query(Order).filter(Order.pickup_or_delivery == "pickup").count()
    total_delivery_orders = db.query(Order).filter(Order.pickup_or_delivery == "delivery").count()

    counts = (
        db.query(OrderItem.menu_item_id, func.sum(OrderItem.qty).label("total_qty"))
        .group_by(OrderItem.menu_item_id)
        .all()
    )
    item_counts = [{"menu_item_id": menu_item_id, "total_qty": total_qty} for menu_item_id, total_qty in counts]

    specials = db.query(Order.id, Order.comment).filter(Order.comment.isnot(None)).all()
    special_requests = [{"order_id": order_id, "comment": comment} for order_id, comment in specials]

    deliveries = (
        db.query(Order.id, Customer.name, Customer.phone, Order.delivery_address, Order.comment)
        .join(Customer, isouter=True)
        .filter(Order.pickup_or_delivery == "delivery")
        .all()
    )
    delivery_list = [
        {
            "order_id": order_id,
            "name": name,
            "phone": phone,
            "address": address,
            "comment": comment,
        }
        for order_id, name, phone, address, comment in deliveries
    ]

    return {
        "total_orders": total_orders,
        "total_pickup_orders": total_pickup_orders,
        "total_delivery_orders": total_delivery_orders,
        "item_counts": item_counts,
        "special_requests": special_requests,
        "delivery_list": delivery_list,
    }

@router.patch("/{order_id}/status", response_model=OrderRead)
def update_order_status(order_id: int, payload: OrderStatusUpdate, db: Session = Depends(get_db)):
    """Update status of an existing order."""
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order