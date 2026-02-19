from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _column_names(engine: Engine, table_name: str) -> set[str]:
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        return set()
    return {col['name'] for col in inspector.get_columns(table_name)}


def ensure_legacy_compat_columns(engine: Engine) -> None:
    """Add required columns when running against pre-existing legacy databases."""
    week_cols = _column_names(engine, 'menu_weeks')
    item_cols = _column_names(engine, 'menu_items')

    with engine.begin() as conn:
        if week_cols:
            if 'week_start_date' not in week_cols:
                conn.execute(text("ALTER TABLE menu_weeks ADD COLUMN week_start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"))
            if 'is_published' not in week_cols:
                conn.execute(text("ALTER TABLE menu_weeks ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT 0"))
            if 'selling_days' not in week_cols:
                conn.execute(text("ALTER TABLE menu_weeks ADD COLUMN selling_days VARCHAR NOT NULL DEFAULT 'Mon,Wed,Fri'"))
            if 'status' not in week_cols:
                conn.execute(text("ALTER TABLE menu_weeks ADD COLUMN status VARCHAR NOT NULL DEFAULT 'OPEN'"))
            if 'published' not in week_cols:
                conn.execute(text("ALTER TABLE menu_weeks ADD COLUMN published BOOLEAN NOT NULL DEFAULT 0"))
            if 'starts_at' not in week_cols:
                conn.execute(text("ALTER TABLE menu_weeks ADD COLUMN starts_at DATETIME"))

            conn.execute(
                text(
                    "UPDATE menu_weeks "
                    "SET starts_at = COALESCE(starts_at, week_start_date, CURRENT_TIMESTAMP), "
                    "week_start_date = COALESCE(week_start_date, starts_at, CURRENT_TIMESTAMP), "
                    "published = COALESCE(published, is_published, 0), "
                    "is_published = COALESCE(is_published, published, 0), "
                    "selling_days = COALESCE(NULLIF(selling_days, ''), 'Mon,Wed,Fri'), "
                    "status = COALESCE(NULLIF(status, ''), 'OPEN')"
                )
            )

        if item_cols:
            if 'photo_url' not in item_cols:
                conn.execute(text("ALTER TABLE menu_items ADD COLUMN photo_url VARCHAR"))
            if 'available' not in item_cols:
                conn.execute(text("ALTER TABLE menu_items ADD COLUMN available BOOLEAN NOT NULL DEFAULT 1"))
            if 'created_at' not in item_cols:
                conn.execute(text("ALTER TABLE menu_items ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"))

            conn.execute(
                text(
                    "UPDATE menu_items "
                    "SET available = COALESCE(available, is_active, CASE WHEN is_sold_out = 1 THEN 0 ELSE 1 END, 1)"
                )
            )
