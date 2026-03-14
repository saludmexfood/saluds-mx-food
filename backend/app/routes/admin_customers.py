from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Customer
from ..schemas import CustomerCreate, CustomerRead
from ..security import require_admin

router = APIRouter(
    prefix="/api/admin/customers",
    tags=["Admin Customers"],
    dependencies=[Depends(require_admin)],
)


@router.get("/", response_model=List[CustomerRead])
def list_customers(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.created_at.desc()).all()


@router.post("/", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    existing = db.query(Customer).filter(Customer.phone == payload.phone).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Customer with this phone already exists")

    customer = Customer(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        sms_opt_in=payload.sms_opt_in,
        email_opt_in=payload.email_opt_in,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).get(customer_id)
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"ok": True}
