from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..db import get_db
from ..models import Order, OrderItem, Customer
from ..schemas import OrderCreate, OrderRead, OrderStatusUpdate, OrdersTally, OrderUpdate
from ..security import require_admin

router = APIRouter(
    prefix="/api/admin/orders",
    tags=["Admin Orders"],
    dependencies=[Depends(require_admin)],
)


def _upsert_customer(db: Session, order: Order):
    customer = db.query(Customer).filter(Customer.phone == order.phone).first()
    if customer:
        customer.name = order.customer_name or customer.name
        customer.email = order.email
        if order.delivery_address:
            customer.address = order.delivery_address
    elif order.customer_name and order.phone:
        customer = Customer(
            name=order.customer_name,
            phone=order.phone,
            email=order.email,
            address=order.delivery_address,
            sms_opt_in=False,
            email_opt_in=False,
        )
        db.add(customer)
        db.flush()
    if customer:
        order.customer_id = customer.id


def _replace_items(db: Session, order: Order, items):
    db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()
    db.flush()
    subtotal = 0
    for item in items:
        created = OrderItem(
            order_id=order.id,
            menu_item_id=item.menu_item_id,
            qty=max(1, item.qty),
            line_total_cents=max(0, item.line_total_cents),
        )
        subtotal += created.line_total_cents
        db.add(created)
    return subtotal


@router.get("/", response_model=List[OrderRead])
def list_admin_orders(db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.created_at.desc()).all()


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_admin_order(payload: OrderCreate, db: Session = Depends(get_db)):
    order = Order(
        customer_name=payload.customer_name,
        customer_id=payload.customer_id,
        phone=payload.phone,
        email=payload.email,
        pickup_or_delivery=payload.pickup_or_delivery,
        delivery_fee_cents=payload.delivery_fee_cents,
        delivery_address=payload.delivery_address,
        comment=payload.comment,
        total_cents=payload.total_cents,
    )
    db.add(order)
    db.flush()
    subtotal = _replace_items(db, order, payload.items)
    order.total_cents = subtotal + max(0, payload.delivery_fee_cents)
    _upsert_customer(db, order)
    db.commit()
    db.refresh(order)
    return order


@router.patch("/{order_id}", response_model=OrderRead)
def update_admin_order(order_id: int, payload: OrderUpdate, db: Session = Depends(get_db)):
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")

    data = payload.dict(exclude_unset=True)
    items = data.pop("items", None)
    price_adjustment_cents = data.pop("price_adjustment_cents", 0) or 0

    for field, value in data.items():
        setattr(order, field, value)

    subtotal = sum(item.line_total_cents for item in order.items)
    if items is not None:
        subtotal = _replace_items(db, order, items)

    order.total_cents = max(0, subtotal + order.delivery_fee_cents + price_adjustment_cents)
    _upsert_customer(db, order)
    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}")
def delete_admin_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    db.delete(order)
    db.commit()
    return {"ok": True}


@router.get("/tally", response_model=OrdersTally)
def tally_orders(db: Session = Depends(get_db)):
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
        db.query(Order.id, Order.customer_name, Order.phone, Order.delivery_address, Order.comment)
        .filter(Order.pickup_or_delivery == "delivery")
        .all()
    )
    delivery_list = [
        {"order_id": order_id, "name": name, "phone": phone, "address": address, "comment": comment}
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
    order = db.query(Order).get(order_id)
    if not order:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order
