"""
Repozytorium ulubionych pokoi - jedyne miejsce budujące zapytania SQLAlchemy
do tabeli `favorites`. Pozwala zalogowanemu najemcy (`role='tenant'`) dodawać
i usuwać ogłoszenia z ulubionych oraz udostępnia panelowi administratora
("Zarządzanie pokojami") liczbę polubień per ogłoszenie.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy import delete as sa_delete
from sqlalchemy import insert as sa_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.db.models import favorites, offers


class FavoriteRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, user_id: int, offer_id: str) -> bool:
        """Dodaje ogłoszenie do ulubionych. Zwraca False, jeśli już tam
        było (unikalność `user_id`+`offer_id`), True jeśli dodano nowy wpis."""
        try:
            stmt = sa_insert(favorites).values(
                user_id=user_id,
                offer_id=offer_id,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            self.db.execute(stmt)
            self.db.commit()
            return True
        except IntegrityError:
            self.db.rollback()
            return False

    def remove(self, user_id: int, offer_id: str) -> bool:
        stmt = sa_delete(favorites).where(
            favorites.c.user_id == user_id, favorites.c.offer_id == offer_id
        )
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount > 0

    def is_favorited(self, user_id: int, offer_id: str) -> bool:
        stmt = select(favorites.c.id).where(
            favorites.c.user_id == user_id, favorites.c.offer_id == offer_id
        )
        return self.db.execute(stmt).first() is not None

    def count_for_offer(self, offer_id: str) -> int:
        stmt = select(func.count()).select_from(favorites).where(favorites.c.offer_id == offer_id)
        return self.db.execute(stmt).scalar_one()

    def counts_for_offers(self, offer_ids: list[str]) -> dict[str, int]:
        """Liczba polubień per ogłoszenie (zbiorczo) - używane przez panel
        administratora, żeby uniknąć N+1 zapytań przy liście ofert."""
        if not offer_ids:
            return {}
        stmt = (
            select(favorites.c.offer_id, func.count().label("count"))
            .where(favorites.c.offer_id.in_(offer_ids))
            .group_by(favorites.c.offer_id)
        )
        return {row.offer_id: row.count for row in self.db.execute(stmt).all()}

    def favorite_ids_for_user(self, user_id: int) -> list[str]:
        """Lista id ofert polubionych przez danego użytkownika - pozwala
        frontendowi oznaczyć serduszkiem odpowiednie karty na liście ofert
        bez odpytywania backendu per-karta."""
        stmt = select(favorites.c.offer_id).where(favorites.c.user_id == user_id)
        return [row[0] for row in self.db.execute(stmt).all()]

    def list_offers_for_user(
        self, user_id: int, page: int = 1, limit: int = 20
    ) -> tuple[list[dict[str, Any]], int]:
        """Zwraca (oferty, total) ulubionych danego użytkownika, posortowane
        od najnowszego polubienia. Ogłoszenia usunięte z bazy znikają też z
        ulubionych (ON DELETE CASCADE na `favorites.offer_id`)."""
        base = select(favorites.c.offer_id).where(favorites.c.user_id == user_id)
        total = self.db.execute(
            select(func.count()).select_from(base.subquery())
        ).scalar_one()

        stmt = (
            select(offers, favorites.c.created_at.label("favorited_at"))
            .join(favorites, favorites.c.offer_id == offers.c.id)
            .where(favorites.c.user_id == user_id)
            .order_by(favorites.c.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        rows = self.db.execute(stmt).all()

        result = []
        for row in rows:
            mapping = dict(row._mapping)
            mapping.pop("favorited_at", None)
            result.append(_row_to_dict_from_mapping(mapping))
        return result, total


def _row_to_dict_from_mapping(mapping: dict[str, Any]) -> dict[str, Any]:
    """Reimplementacja `offer_repository._row_to_dict` operująca na już
    zmaterializowanym dict (bo `select(offers, favorites.c...)` zwraca wiersz
    łączony, którego nie da się bezpośrednio podać do `_row_to_dict`, które
    oczekuje surowego obiektu wiersza z `row._mapping`)."""
    photos_raw = mapping.pop("photos", None) or "[]"
    try:
        photos = json.loads(photos_raw)
    except (json.JSONDecodeError, TypeError):
        photos = []
    mapping["photos"] = photos
    mapping["negotiable"] = bool(mapping["negotiable"]) if mapping["negotiable"] is not None else None
    mapping["has_additional_cost"] = (
        bool(mapping["has_additional_cost"]) if mapping["has_additional_cost"] is not None else None
    )
    mapping["has_deposit"] = bool(mapping["has_deposit"]) if mapping["has_deposit"] is not None else None
    mapping["has_deposit_cost"] = (
        bool(mapping["has_deposit_cost"]) if mapping["has_deposit_cost"] is not None else None
    )
    return mapping
