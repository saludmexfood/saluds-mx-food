import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import SiteSetting
from ..schemas import SiteSettingsRead, SiteSettingsUpdate
from ..security import require_admin

router = APIRouter(tags=["Site Settings"])

DEFAULT_SETTINGS = {
    "homepage": {
        "top_phrase": "Homestyle Mexican food made fresh for you.",
        "title": "This Week's Menu",
        "subtitle": "",
    },
    "about": {
        "paragraph": "At Salud's Mexican Meals, every plate is made with warmth, tradition, and care.",
        "hours_contact": "Serving Fridays · 1320 E 11th Avenue, Winfield, KS 67156 · 620.262.1073 · parrasalud@gmail.com",
    },
    "contact": {"instagram": True, "facebook": True, "whatsapp": True, "phone": True, "sms": True, "email": True},
    "recovery": {"pin": "4026", "destination_email": "parrasalud@gmail.com", "destination_phone": "6202621073"},
    "background": {"selected": "floral-bg"},
}


def _get_data(db: Session):
    record = db.query(SiteSetting).filter(SiteSetting.key == "global").first()
    if not record:
        return DEFAULT_SETTINGS
    try:
        return {**DEFAULT_SETTINGS, **json.loads(record.value_json)}
    except json.JSONDecodeError:
        return DEFAULT_SETTINGS


@router.get("/api/public/settings", response_model=SiteSettingsRead)
def get_public_settings(db: Session = Depends(get_db)):
    return {"data": _get_data(db)}


@router.get("/api/admin/settings", response_model=SiteSettingsRead, dependencies=[Depends(require_admin)])
def get_admin_settings(db: Session = Depends(get_db)):
    return {"data": _get_data(db)}


@router.put("/api/admin/settings", response_model=SiteSettingsRead, dependencies=[Depends(require_admin)])
def update_admin_settings(payload: SiteSettingsUpdate, db: Session = Depends(get_db)):
    record = db.query(SiteSetting).filter(SiteSetting.key == "global").first()
    data = {**DEFAULT_SETTINGS, **payload.data}
    if not record:
        record = SiteSetting(key="global", value_json=json.dumps(data))
        db.add(record)
    else:
        record.value_json = json.dumps(data)
    db.commit()
    return {"data": data}
