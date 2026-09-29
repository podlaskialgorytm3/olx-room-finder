"""
Repozytorium powiadomień (centrum powiadomień) - jedyne miejsce budujące
zapytania SQLAlchemy do tabeli `notifications`. Wiersze są tworzone przez
`backend.services.notification_service` (podczas synchronizacji OLX); ten
repozytorium obsługuje wyłącznie odczyt i oznaczanie jako przeczytane przez
zalogowanego użytkownika.
"""

from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy import update as sa_update
from sqlalchemy.orm import Session

from backend.db.models import notifications


def _row_to_dict(row: Any) -> dict[str, Any]:
    mapping = dict(row._mapping)
    mapping["is_read"] = bool(mapping["is_read"])
    return mapping


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_for_user(
        self, user_id: int, unread_only: bool = False, page: int = 1, limit: int = 20
    ) -> tuple[list[dict[str, Any]], int]:
        base = select(notifications).where(notifications.c.user_id == user_id)
        if unread_only:
            base = base.where(notifications.c.is_read == 0)

        total = self.db.execute(
            select(func.count()).select_from(base.subquery())
        ).scalar_one()

        stmt = base.order_by(notifications.c.created_at.desc()).offset((page - 1) * limit).limit(limit)
        rows = self.db.execute(stmt).all()
        return [_row_to_dict(row) for row in rows], total

    def count_unread(self, user_id: int) -> int:
        stmt = (
            select(func.count())
            .select_from(notifications)
            .where(notifications.c.user_id == user_id, notifications.c.is_read == 0)
        )
        return self.db.execute(stmt).scalar_one()

    def get_by_id(self, notification_id: int) -> Optional[dict[str, Any]]:
        stmt = select(notifications).where(notifications.c.id == notification_id)
        row = self.db.execute(stmt).first()
        return _row_to_dict(row) if row else None

    def mark_read(self, notification_id: int) -> Optional[dict[str, Any]]:
        stmt = sa_update(notifications).where(notifications.c.id == notification_id).values(is_read=1)
        result = self.db.execute(stmt)
        self.db.commit()
        if result.rowcount == 0:
            return None
        return self.get_by_id(notification_id)

    def mark_all_read(self, user_id: int) -> int:
        stmt = (
            sa_update(notifications)
            .where(notifications.c.user_id == user_id, notifications.c.is_read == 0)
            .values(is_read=1)
        )
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount
