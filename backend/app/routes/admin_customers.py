import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Customer
from ..schemas import CustomerCreate, CustomerRead, CustomerUpdate
from ..security import require_admin

router = APIRouter(
    prefix="/api/admin/customers",
    tags=["Admin Customers"],
    dependencies=[Depends(require_admin)],
)


def _as_read_model(customer: Customer) -> CustomerRead:
    return CustomerRead(
        id=customer.id,
        created_at=customer.created_at,
        name=customer.name,
        phone=customer.phone,
        email=customer.email,
        address=customer.address,
        city=customer.city,
        zip_code=customer.zip_code,
        additional_phones=json.loads(customer.additional_phones or "[]"),
        additional_emails=json.loads(customer.additional_emails or "[]"),
        sms_opt_in=customer.sms_opt_in,
        email_opt_in=customer.email_opt_in,
    )


@router.get("/", response_model=List[CustomerRead])
def list_customers(db: Session = Depends(get_db)):
    customers = db.query(Customer).order_by(Customer.created_at.desc()).all()
    return [_as_read_model(customer) for customer in customers]


@router.post("/", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)):
    existing = db.query(Customer).filter(Customer.phone == payload.phone).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Customer with this phone already exists")

    customer = Customer(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        city=payload.city,
        zip_code=payload.zip_code,
        additional_phones=json.dumps(payload.additional_phones),
        additional_emails=json.dumps(payload.additional_emails),
        sms_opt_in=payload.sms_opt_in,
        email_opt_in=payload.email_opt_in,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return _as_read_model(customer)


@router.patch("/{customer_id}", response_model=CustomerRead)
def update_customer(customer_id: int, payload: CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.query(Customer).get(customer_id)
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Customer not found")

    data = payload.dict(exclude_unset=True)
    if "additional_phones" in data:
        data["additional_phones"] = json.dumps(data["additional_phones"])
    if "additional_emails" in data:
        data["additional_emails"] = json.dumps(data["additional_emails"])

    for field, value in data.items():
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return _as_read_model(customer)


@router.delete("/{customer_id}")
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).get(customer_id)
    if not customer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return {"ok": True}
