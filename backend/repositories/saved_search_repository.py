"""
Repozytorium zapisanych wyszukiwań (alertów ofertowych) - jedyne miejsce
budujące zapytania SQLAlchemy do tabeli `saved_searches`. Odpowiada też za
zliczanie ofert pasujących do danego alertu (`count_matches`/`list_matches`),
używane przez `/api/saved-searches/{id}/matches` i podgląd statusu alertu.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert as sa_insert
from sqlalchemy import update as sa_update
from sqlalchemy.orm import Session

from backend.db.models import notifications, offers, saved_searches


def _row_to_dict(row: Any) -> dict[str, Any]:
    mapping = dict(row._mapping)
    districts_raw = mapping.pop("districts", None)
    try:
        mapping["districts"] = json.loads(districts_raw) if districts_raw else []
    except (json.JSONDecodeError, TypeError):
        mapping["districts"] = []
    mapping["notification_enabled"] = bool(mapping["notification_enabled"])
    mapping["notify_new_offers"] = bool(mapping["notify_new_offers"])
    mapping["notify_price_drops"] = bool(mapping["notify_price_drops"])
    return mapping


class SavedSearchRepository:
    def __init__(self, db: Session):
        self.db = db

    def count_active_for_user(self, user_id: int) -> int:
        stmt = (
            select(func.count())
            .select_from(saved_searches)
            .where(saved_searches.c.user_id == user_id, saved_searches.c.notification_enabled == 1)
        )
        return self.db.execute(stmt).scalar_one()

    def list_for_user(self, user_id: int) -> list[dict[str, Any]]:
        stmt = (
            select(saved_searches)
            .where(saved_searches.c.user_id == user_id)
            .order_by(saved_searches.c.created_at.desc())
        )
        rows = self.db.execute(stmt).all()
        return [_row_to_dict(row) for row in rows]

    def get_by_id(self, search_id: int) -> Optional[dict[str, Any]]:
        stmt = select(saved_searches).where(saved_searches.c.id == search_id)
        row = self.db.execute(stmt).first()
        return _row_to_dict(row) if row else None

    def create(self, user_id: int, values: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        db_values = self._to_db_values(values)
        db_values["user_id"] = user_id
        db_values["created_at"] = now
        db_values["updated_at"] = now

        stmt = sa_insert(saved_searches).values(**db_values)
        result = self.db.execute(stmt)
        self.db.commit()
        return self.get_by_id(result.inserted_primary_key[0])  # type: ignore[return-value]

    def update(self, search_id: int, values: dict[str, Any]) -> Optional[dict[str, Any]]:
        if not values:
            return self.get_by_id(search_id)

        db_values = self._to_db_values(values)
        db_values["updated_at"] = datetime.now(timezone.utc).isoformat()

        stmt = sa_update(saved_searches).where(saved_searches.c.id == search_id).values(**db_values)
        result = self.db.execute(stmt)
        self.db.commit()
        if result.rowcount == 0:
            return None
        return self.get_by_id(search_id)

    def set_enabled(self, search_id: int, enabled: bool) -> Optional[dict[str, Any]]:
        return self.update(search_id, {"notification_enabled": enabled})

    def delete(self, search_id: int) -> bool:
        stmt = sa_delete(saved_searches).where(saved_searches.c.id == search_id)
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount > 0

    def count_new_notifications(self, search_id: int) -> int:
        """Liczba powiadomień NEW_OFFER/PRICE_DROP wygenerowanych dotąd przez
        ten alert - pokazywane na `/alerts` jako "Nowe oferty"."""
        stmt = select(func.count()).select_from(notifications).where(notifications.c.saved_search_id == search_id)
        return self.db.execute(stmt).scalar_one()

    def count_matches(self, search: dict[str, Any]) -> int:
        """Liczba aktualnie dostępnych ofert spełniających kryteria alertu -
        pokazywane na `/alerts` jako "Znaleziono ofert"."""
        stmt = select(func.count()).select_from(offers)
        stmt = self._apply_match_filters(stmt, search)
        return self.db.execute(stmt).scalar_one()

    def list_matches(self, search: dict[str, Any], limit: int = 50) -> list[dict[str, Any]]:
        stmt = select(offers).order_by(offers.c.created_at.desc()).limit(limit)
        stmt = self._apply_match_filters(stmt, search)
        rows = self.db.execute(stmt).all()

        result = []
        for row in rows:
            mapping = dict(row._mapping)
            photos_raw = mapping.pop("photos", None) or "[]"
            try:
                mapping["photos"] = json.loads(photos_raw)
            except (json.JSONDecodeError, TypeError):
                mapping["photos"] = []
            for bool_col in ("negotiable", "has_additional_cost", "has_deposit", "has_deposit_cost"):
                mapping[bool_col] = bool(mapping[bool_col]) if mapping[bool_col] is not None else None
            result.append(mapping)
        return result

    def touch_last_checked(self, search_id: int) -> None:
        stmt = (
            sa_update(saved_searches)
            .where(saved_searches.c.id == search_id)
            .values(last_checked_at=datetime.now(timezone.utc).isoformat())
        )
        self.db.execute(stmt)
        self.db.commit()

    @staticmethod
    def _apply_match_filters(stmt, search: dict[str, Any]):
        stmt = stmt.where(offers.c.status == "approved")
        if search.get("city_id"):
            stmt = stmt.where(offers.c.city == search["city_id"])
        if search.get("category"):
            stmt = stmt.where(offers.c.category == search["category"])
        if search.get("min_price") is not None:
            stmt = stmt.where(offers.c.price >= search["min_price"])
        if search.get("max_price") is not None:
            stmt = stmt.where(offers.c.price <= search["max_price"])
        if search.get("min_area") is not None:
            stmt = stmt.where(offers.c.area_m2 >= search["min_area"])
        if search.get("max_area") is not None:
            stmt = stmt.where(offers.c.area_m2 <= search["max_area"])
        if search.get("source"):
            stmt = stmt.where(offers.c.source == search["source"])
        districts = search.get("districts") or []
        if districts:
            stmt = stmt.where(offers.c.district.in_(districts))
        return stmt

    @staticmethod
    def _to_db_values(values: dict[str, Any]) -> dict[str, Any]:
        db_values: dict[str, Any] = {}
        for key, value in values.items():
            if key == "districts":
                db_values[key] = json.dumps(value if value else [], ensure_ascii=False)
            elif key in ("notification_enabled", "notify_new_offers", "notify_price_drops"):
                db_values[key] = int(value)
            else:
                db_values[key] = value
        return db_values
