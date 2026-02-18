"""
Stripe Checkout Session creation and Webhook handler.

POST /api/public/checkout/session  — creates a Stripe Checkout session for an order
POST /api/public/stripe/webhook    — verifies Stripe signature and marks order as PAID
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..models import MenuItem, Order, OrderStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/public", tags=["Public Stripe"])


class CheckoutRequest(BaseModel):
    order_id: int


@router.post("/checkout/session")
def create_checkout_session(
    payload: CheckoutRequest, db: Session = Depends(get_db)
):
    """
    Load the order from DB, build Stripe line items, create a Checkout Session,
    persist the session ID on the order, and return the redirect URL.
    """
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=503, detail="Stripe is not configured on this server"
        )

    import stripe  # imported here so the module still loads when stripe is not installed

    stripe.api_key = settings.STRIPE_SECRET_KEY

    order = db.query(Order).get(payload.order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    line_items = []
    for oi in order.items:
        menu_item = db.query(MenuItem).get(oi.menu_item_id)
        if menu_item:
            line_items.append(
                {
                    "price_data": {
                        "currency": "usd",
                        "product_data": {"name": menu_item.name},
                        "unit_amount": menu_item.price_cents,
                    },
                    "quantity": oi.qty,
                }
            )

    if not line_items:
        raise HTTPException(status_code=400, detail="No valid items found in order")

    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=line_items,
        mode="payment",
        success_url=settings.STRIPE_SUCCESS_URL,
        cancel_url=settings.STRIPE_CANCEL_URL,
        metadata={"order_id": str(order.id)},
    )

    order.stripe_session_id = session.id
    db.commit()
    logger.info("Stripe Checkout session %s created for order %s", session.id, order.id)

    return {"url": session.url, "session_id": session.id}


@router.post("/stripe/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Receive Stripe webhook events. Verifies the signature, then on
    checkout.session.completed marks the order as PAID.
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(
            status_code=503, detail="Stripe webhook secret is not configured"
        )

    import stripe

    stripe.api_key = settings.STRIPE_SECRET_KEY

    raw_body = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            raw_body, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid webhook payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event.get("type", "")
    if event_type == "checkout.session.completed":
        obj = event["data"]["object"]
        order_id_str = obj.get("metadata", {}).get("order_id")
        if order_id_str:
            order = db.query(Order).get(int(order_id_str))
            if order:
                order.status = OrderStatus.PAID
                order.payment_intent_id = obj.get("payment_intent")
                db.commit()
                logger.info("Order %s marked as PAID via Stripe webhook", order_id_str)

    return {"status": "ok"}
