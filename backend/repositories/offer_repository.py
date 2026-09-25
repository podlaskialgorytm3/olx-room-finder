"""
Repozytorium ofert - jedyne miejsce budujące zapytania SQLAlchemy do tabeli
`offers`. Handlery HTTP i serwisy nie znają SQL-a, tylko wywołują metody
tego repozytorium.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Select, func, or_, select
from sqlalchemy import delete as sa_delete
from sqlalchemy import update as sa_update
from sqlalchemy.orm import Session

from backend.db.models import offers

# Pola tri-state/bool zapisywane w bazie jako 0/1/NULL.
_BOOL_COLUMNS = {"negotiable", "has_additional_cost", "has_deposit", "has_deposit_cost"}


@dataclass
class OfferFilters:
    city: Optional[str] = None
    district: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    min_total_monthly_cost: Optional[float] = None
    max_total_monthly_cost: Optional[float] = None
    negotiable: Optional[bool] = None
    has_additional_cost: Optional[bool] = None
    has_deposit: Optional[bool] = None
    has_deposit_cost: Optional[bool] = None
    search: Optional[str] = None


SORTABLE_COLUMNS = {
    "price": offers.c.price,
    "total_monthly_cost": offers.c.total_monthly_cost,
    "additional_cost": offers.c.additional_cost,
    "deposit": offers.c.deposit,
    "created_at": offers.c.created_at,
    "views_count": offers.c.views_count,
}


def _apply_filters(stmt: Select, filters: OfferFilters) -> Select:
    if filters.city:
        stmt = stmt.where(offers.c.city == filters.city)
    if filters.district:
        stmt = stmt.where(offers.c.district == filters.district)
    if filters.min_price is not None:
        stmt = stmt.where(offers.c.price >= filters.min_price)
    if filters.max_price is not None:
        stmt = stmt.where(offers.c.price <= filters.max_price)
    if filters.min_total_monthly_cost is not None:
        stmt = stmt.where(offers.c.total_monthly_cost >= filters.min_total_monthly_cost)
    if filters.max_total_monthly_cost is not None:
        stmt = stmt.where(offers.c.total_monthly_cost <= filters.max_total_monthly_cost)
    if filters.negotiable is not None:
        stmt = stmt.where(offers.c.negotiable == int(filters.negotiable))
    # Pola tri-state (0/1/NULL): jawnie wykluczamy NULL, bo "nie wiadomo" nie
    # jest równoznaczne ani z true, ani z false.
    if filters.has_additional_cost is True:
        # "Tylko z dodatkowymi dopłatami" ma sens tylko wtedy, gdy oferta ma
        # has_additional_cost=true ORAZ znaną kwotę (additional_cost jako
        # liczba, w tym 0) - has_additional_cost=true z additional_cost=NULL
        # oznacza "wiadomo, że są opłaty, ale kwota nieznana" i nie pozwala
        # pokazać pełnej ceny, więc takie oferty odfiltrowujemy.
        stmt = stmt.where(offers.c.has_additional_cost == 1, offers.c.additional_cost.is_not(None))
    elif filters.has_additional_cost is False:
        stmt = stmt.where(offers.c.has_additional_cost == 0)
    if filters.has_deposit is not None:
        stmt = stmt.where(offers.c.has_deposit == int(filters.has_deposit))
    if filters.has_deposit_cost is not None:
        stmt = stmt.where(offers.c.has_deposit_cost == int(filters.has_deposit_cost))
    if filters.search:
        pattern = f"%{filters.search}%"
        stmt = stmt.where(
            or_(
                offers.c.title.ilike(pattern),
                offers.c.description.ilike(pattern),
                offers.c.address.ilike(pattern),
            )
        )
    return stmt


def _row_to_dict(row: Any) -> dict[str, Any]:
    mapping = dict(row._mapping)
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


class OfferRepository:
    def __init__(self, db: Session):
        self.db = db

    def search(
        self,
        filters: OfferFilters,
        sort: str = "created_at",
        order: str = "desc",
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[dict[str, Any]], int]:
        base_stmt = _apply_filters(select(offers), filters)

        total = self.db.execute(
            select(func.count()).select_from(base_stmt.subquery())
        ).scalar_one()

        sort_column = SORTABLE_COLUMNS.get(sort, offers.c.created_at)
        ordered_column = sort_column.asc() if order == "asc" else sort_column.desc()

        stmt = base_stmt.order_by(ordered_column).offset((page - 1) * limit).limit(limit)
        rows = self.db.execute(stmt).all()

        return [_row_to_dict(row) for row in rows], total

    def get_by_id(self, offer_id: str) -> Optional[dict[str, Any]]:
        stmt = select(offers).where(offers.c.id == offer_id)
        row = self.db.execute(stmt).first()
        return _row_to_dict(row) if row else None

    def values_for_filters(self, filters: OfferFilters, column_name: str) -> list[Optional[float]]:
        """Zwraca surową listę wartości danej kolumny dla przefiltrowanego
        zbioru - używane przez warstwę statystyk/analiz do liczenia mediany,
        IQR, itd. (SQLite nie ma wbudowanej funkcji mediany)."""
        column = SORTABLE_COLUMNS.get(column_name)
        if column is None:
            column = getattr(offers.c, column_name)
        stmt = _apply_filters(select(column), filters)
        return [row[0] for row in self.db.execute(stmt).all()]

    def distinct_districts(self, city: Optional[str] = None) -> list[str]:
        stmt = (
            select(offers.c.district)
            .where(offers.c.district.is_not(None))
            .distinct()
            .order_by(offers.c.district)
        )
        if city:
            stmt = stmt.where(offers.c.city == city)
        return [row[0] for row in self.db.execute(stmt).all()]

    def count_for_filters(self, filters: OfferFilters) -> int:
        stmt = _apply_filters(select(func.count()).select_from(offers), filters)
        return self.db.execute(stmt).scalar_one()

    def rows_for_filters(self, filters: OfferFilters, columns: list[str]) -> list[dict[str, Any]]:
        """Zwraca surowe wiersze (tylko wskazane kolumny) dla analizy per-oferta."""
        selected = [getattr(offers.c, col) for col in columns]
        stmt = _apply_filters(select(*selected), filters)
        return [dict(row._mapping) for row in self.db.execute(stmt).all()]

    def update(self, offer_id: str, values: dict[str, Any]) -> Optional[dict[str, Any]]:
        """Aktualizuje wybrane pola oferty (panel administratora - poprawianie
        błędów LLM z pobierania danych). `values` to słownik pól gotowych do
        zapisania (klucze pydantic == kolumny), z pominięciem nieustawionych."""
        if not values:
            return self.get_by_id(offer_id)

        db_values: dict[str, Any] = {}
        for key, value in values.items():
            if key == "photos":
                db_values[key] = json.dumps(value if value is not None else [])
            elif key in _BOOL_COLUMNS:
                db_values[key] = None if value is None else int(value)
            else:
                db_values[key] = value
        db_values["updated_at"] = datetime.now(timezone.utc).isoformat()

        stmt = sa_update(offers).where(offers.c.id == offer_id).values(**db_values)
        result = self.db.execute(stmt)
        self.db.commit()
        if result.rowcount == 0:
            return None
        return self.get_by_id(offer_id)

    def delete(self, offer_id: str) -> bool:
        stmt = sa_delete(offers).where(offers.c.id == offer_id)
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount > 0

    def increment_views(self, offer_id: str) -> None:
        """Nabija jedno wyświetlenie oferty - wywoływane, gdy użytkownik
        otwiera stronę szczegółów danego pokoju. Wynik widoczny jest w
        panelu administratora (zarządzanie pokojami)."""
        stmt = (
            sa_update(offers)
            .where(offers.c.id == offer_id)
            .values(views_count=offers.c.views_count + 1)
        )
        self.db.execute(stmt)
        self.db.commit()
