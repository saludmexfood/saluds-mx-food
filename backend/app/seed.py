from datetime import datetime

from sqlalchemy.orm import Session

from .models import MenuItem, MenuWeek, WeekStatus


DEMO_MENU_ITEMS = [
    ("Tacos al Pastor", "Marinated pork, pineapple, cilantro, onion", 12900),
    ("Pollo Asado Bowl", "Grilled chicken, rice, black beans, pico", 13900),
    ("Enchiladas Verdes", "Chicken enchiladas with salsa verde", 14900),
    ("Chiles Rellenos", "Poblano peppers stuffed with cheese", 14500),
    ("Carne Asada Plate", "Steak, roasted veggies, tortillas", 16900),
    ("Vegetarian Fajitas", "Peppers, onions, mushrooms, guac", 13500),
    ("Pozole Rojo", "Traditional hominy stew with pork", 15500),
    ("Cochinita Pibil", "Yucatán-style achiote pork", 15900),
]


def seed_demo_menu_if_empty(db: Session) -> bool:
    """
    Seed one published MenuWeek and 8 active MenuItems if no menu data exists.

    Returns True when seed data is inserted, False when seeding is skipped.
    """
    has_menu_data = db.query(MenuWeek.id).first() or db.query(MenuItem.id).first()
    if has_menu_data:
        return False

    starts_at = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week = MenuWeek(
        selling_days="Mon,Wed,Fri",
        status=WeekStatus.OPEN,
        published=True,
        starts_at=starts_at,
        week_start_date=starts_at,
        is_published=True,
    )
    db.add(week)
    db.flush()

    for name, description, price_cents in DEMO_MENU_ITEMS:
        db.add(
            MenuItem(
                menu_week_id=week.id,
                name=name,
                description=description,
                price_cents=price_cents,
                available=True,
            )
        )

    db.commit()
    return True
