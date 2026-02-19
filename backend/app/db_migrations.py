import logging
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)


DEFAULTS = {
    "postgresql": {
        "datetime_type": "TIMESTAMPTZ",
        "current_timestamp": "NOW()",
        "false": "FALSE",
        "true": "TRUE",
    },
    "sqlite": {
        "datetime_type": "DATETIME",
        "current_timestamp": "CURRENT_TIMESTAMP",
        "false": "0",
        "true": "1",
    },
}


def _dialect_name(engine: Engine) -> str:
    return "postgresql" if engine.dialect.name.startswith("postgres") else "sqlite"


def _column_names(conn: Any, dialect: str, table_name: str) -> set[str]:
    if dialect == "postgresql":
        rows = conn.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = current_schema() AND table_name = :table_name
                """
            ),
            {"table_name": table_name},
        )
        return {row[0] for row in rows}

    pragma_rows = conn.execute(text(f"PRAGMA table_info({table_name})"))
    return {row[1] for row in pragma_rows}


def _table_exists(conn: Any, dialect: str, table_name: str) -> bool:
    if dialect == "postgresql":
        row = conn.execute(
            text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = current_schema() AND table_name = :table_name
                )
                """
            ),
            {"table_name": table_name},
        ).scalar()
        return bool(row)

    row = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type = 'table' AND name = :table_name"),
        {"table_name": table_name},
    ).first()
    return row is not None


def _safe_execute(conn: Any, statement: str) -> bool:
    try:
        conn.execute(text(statement))
        return True
    except SQLAlchemyError:
        logger.exception("Migration statement failed: %s", statement)
        return False


def ensure_legacy_compat_columns(engine: Engine) -> None:
    """Run idempotent, dialect-aware schema/data compatibility migrations."""
    dialect = _dialect_name(engine)
    defaults = DEFAULTS[dialect]

    try:
        with engine.begin() as conn:
            if _table_exists(conn, dialect, "menu_weeks"):
                week_cols = _column_names(conn, dialect, "menu_weeks")
                week_additions = [
                    (
                        "week_start_date",
                        f"ALTER TABLE menu_weeks ADD COLUMN week_start_date {defaults['datetime_type']} NOT NULL DEFAULT {defaults['current_timestamp']}",
                    ),
                    (
                        "is_published",
                        f"ALTER TABLE menu_weeks ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT {defaults['false']}",
                    ),
                    (
                        "selling_days",
                        "ALTER TABLE menu_weeks ADD COLUMN selling_days VARCHAR NOT NULL DEFAULT 'Mon,Wed,Fri'",
                    ),
                    (
                        "status",
                        "ALTER TABLE menu_weeks ADD COLUMN status VARCHAR NOT NULL DEFAULT 'OPEN'",
                    ),
                    (
                        "published",
                        f"ALTER TABLE menu_weeks ADD COLUMN published BOOLEAN NOT NULL DEFAULT {defaults['false']}",
                    ),
                    (
                        "starts_at",
                        f"ALTER TABLE menu_weeks ADD COLUMN starts_at {defaults['datetime_type']}",
                    ),
                ]

                for column_name, statement in week_additions:
                    if column_name not in week_cols and _safe_execute(conn, statement):
                        week_cols.add(column_name)

                if week_cols:
                    _safe_execute(
                        conn,
                        "UPDATE menu_weeks "
                        f"SET starts_at = COALESCE(starts_at, week_start_date, {defaults['current_timestamp']}), "
                        f"week_start_date = COALESCE(week_start_date, starts_at, {defaults['current_timestamp']}), "
                        f"published = COALESCE(published, is_published, {defaults['false']}), "
                        f"is_published = COALESCE(is_published, published, {defaults['false']}), "
                        "selling_days = COALESCE(NULLIF(selling_days, ''), 'Mon,Wed,Fri'), "
                        "status = COALESCE(NULLIF(status, ''), 'OPEN')",
                    )

            if _table_exists(conn, dialect, "menu_items"):
                item_cols = _column_names(conn, dialect, "menu_items")
                item_additions = [
                    ("photo_url", "ALTER TABLE menu_items ADD COLUMN photo_url VARCHAR"),
                    (
                        "available",
                        f"ALTER TABLE menu_items ADD COLUMN available BOOLEAN NOT NULL DEFAULT {defaults['true']}",
                    ),
                    (
                        "created_at",
                        f"ALTER TABLE menu_items ADD COLUMN created_at {defaults['datetime_type']} DEFAULT {defaults['current_timestamp']}",
                    ),
                ]

                for column_name, statement in item_additions:
                    if column_name not in item_cols and _safe_execute(conn, statement):
                        item_cols.add(column_name)

                if item_cols:
                    available_fallbacks = ["available"]
                    if "is_active" in item_cols:
                        available_fallbacks.append("is_active")
                    if "is_sold_out" in item_cols:
                        available_fallbacks.append(
                            f"CASE WHEN is_sold_out = 1 THEN {defaults['false']} ELSE {defaults['true']} END"
                        )
                    available_fallbacks.append(defaults["true"])
                    _safe_execute(
                        conn,
                        "UPDATE menu_items "
                        f"SET available = COALESCE({', '.join(available_fallbacks)})",
                    )
    except SQLAlchemyError as exc:
        logger.exception("Database unreachable during startup migrations")
        raise RuntimeError("Database unreachable during startup migrations") from exc
