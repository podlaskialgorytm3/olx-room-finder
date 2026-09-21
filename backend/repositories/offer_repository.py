"""
Repozytorium ofert - jedyne miejsce budujące zapytania SQLAlchemy do tabeli
`offers`. Handlery HTTP i serwisy nie znają SQL-a, tylko wywołują metody
tego repozytorium.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Optional

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from backend.db.models import offers


@dataclass
class OfferFilters:
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
}


def _apply_filters(stmt: Select, filters: OfferFilters) -> Select:
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
    if filters.has_additional_cost is not None:
        stmt = stmt.where(offers.c.has_additional_cost == int(filters.has_additional_cost))
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

    def distinct_districts(self) -> list[str]:
        stmt = (
            select(offers.c.district)
            .where(offers.c.district.is_not(None))
            .distinct()
            .order_by(offers.c.district)
        )
        return [row[0] for row in self.db.execute(stmt).all()]

    def count_for_filters(self, filters: OfferFilters) -> int:
        stmt = _apply_filters(select(func.count()).select_from(offers), filters)
        return self.db.execute(stmt).scalar_one()

    def rows_for_filters(self, filters: OfferFilters, columns: list[str]) -> list[dict[str, Any]]:
        """Zwraca surowe wiersze (tylko wskazane kolumny) dla analizy per-oferta."""
        selected = [getattr(offers.c, col) for col in columns]
        stmt = _apply_filters(select(*selected), filters)
        return [dict(row._mapping) for row in self.db.execute(stmt).all()]
