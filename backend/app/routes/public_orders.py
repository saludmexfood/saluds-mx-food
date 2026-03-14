from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Order, OrderItem, Customer, MenuItem, OrderStatus
from ..schemas import OrderCreate, OrderRead

router = APIRouter(prefix="/api/public/orders", tags=["Public Orders"])


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    if not payload.items or len(payload.items) == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Order must contain at least one item")
    # Validate delivery vs pickup
    if payload.pickup_or_delivery == "delivery" and not payload.delivery_address:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Delivery address is required for delivery")
    if payload.pickup_or_delivery == "pickup":
        payload.delivery_address = None

    if payload.delivery_fee_cents < 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="delivery_fee_cents must be non-negative")

    customer = db.query(Customer).filter(Customer.phone == payload.phone).first()
    if not customer:
        customer = Customer(
            name=(payload.comment.split('|')[0].replace('Name:', '').strip() if payload.comment else 'Customer'),
            phone=payload.phone,
            email=payload.email,
            sms_opt_in=True,
            email_opt_in=bool(payload.email),
        )
        db.add(customer)
        db.flush()

    order = Order(
        customer_id=customer.id if customer else payload.customer_id,
        phone=payload.phone,
        email=payload.email,
        pickup_or_delivery=payload.pickup_or_delivery,
        delivery_fee_cents=payload.delivery_fee_cents if payload.pickup_or_delivery == "delivery" else 0,
        delivery_address=payload.delivery_address,
        comment=payload.comment,
        total_cents=0,
        status=OrderStatus.PENDING,
    )
    db.add(order)
    db.flush()

    total = 0
    for item_data in payload.items:
        if item_data.qty < 1:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Quantity must be at least 1")
        menu_item = db.query(MenuItem).get(item_data.menu_item_id)
        if not menu_item:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"MenuItem {item_data.menu_item_id} not found")
        line_total = menu_item.price_cents * item_data.qty
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item_data.menu_item_id,
            qty=item_data.qty,
            line_total_cents=line_total,
        )
        db.add(order_item)
        total += line_total

    order.total_cents = total + order.delivery_fee_cents
    db.commit()
    db.refresh(order)
    return order
