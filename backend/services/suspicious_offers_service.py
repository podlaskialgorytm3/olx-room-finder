"""
Wykrywanie podejrzanych/nietypowych ofert.

WAŻNE - to jest sygnał "wymaga dodatkowej uwagi", NIE stwierdzenie, że oferta
jest oszustwem. Komunikaty w kodzie i UI muszą używać neutralnych określeń
("Nietypowa cena", "Częste zmiany ceny", "Możliwy duplikat"), nigdy słów typu
"oszustwo"/"scam"/"fałszywa oferta".

Trzy niezależne kryteria, oferta może spełniać kilka jednocześnie:

1. LOW_PRICE - cena (total_monthly_cost, a w jego braku price) jest co
   najmniej `SUSPICIOUS_PRICE_DROP_THRESHOLD` (40%) poniżej mediany ofert
   podobnych (to samo miasto + kategoria + dzielnica). Jeśli podobnych ofert
   jest mniej niż `SUSPICIOUS_MIN_SIMILAR_OFFERS`, oferta NIGDY nie jest
   oznaczana na tej podstawie (za mało danych = brak wiarygodnej mediany).

2. FREQUENT_PRICE_CHANGES - co najmniej `SUSPICIOUS_PRICE_CHANGE_MIN_COUNT`
   zdarzeń 'price_changed' w `offer_history` w ciągu ostatnich
   `SUSPICIOUS_PRICE_CHANGE_WINDOW_DAYS` dni. Wykorzystuje istniejącą tabelę
   historii - nie tworzy nowego systemu śledzenia zmian.

3. POSSIBLE_DUPLICATE - inna aktywna oferta w tej samej dzielnicy ma bardzo
   podobny tytuł ORAZ opis (SequenceMatcher.ratio() >= progu). MVP nie
   porównuje zdjęć.

Wszystkie funkcje operują na całym zbiorze zatwierdzonych ofert na raz
(zbiór jest mały - patrz `backend/config.py`), żeby uniknąć N zapytań do bazy
przy renderowaniu listy ofert.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import (
    SUSPICIOUS_DUPLICATE_DESCRIPTION_SIMILARITY,
    SUSPICIOUS_DUPLICATE_TITLE_SIMILARITY,
    SUSPICIOUS_MIN_SIMILAR_OFFERS,
    SUSPICIOUS_PRICE_CHANGE_MIN_COUNT,
    SUSPICIOUS_PRICE_CHANGE_WINDOW_DAYS,
    SUSPICIOUS_PRICE_DROP_THRESHOLD,
)
from backend.db.models import offer_history, offers
from backend.services import stats_math

WARNING_LOW_PRICE = "LOW_PRICE"
WARNING_FREQUENT_PRICE_CHANGES = "FREQUENT_PRICE_CHANGES"
WARNING_POSSIBLE_DUPLICATE = "POSSIBLE_DUPLICATE"

_OFFER_COLUMNS = [
    "id",
    "title",
    "city",
    "category",
    "district",
    "description",
    "price",
    "total_monthly_cost",
]


@dataclass
class _OfferRow:
    id: str
    title: str
    city: Optional[str]
    category: Optional[str]
    district: Optional[str]
    description: Optional[str]
    price: Optional[float]
    total_monthly_cost: Optional[float]

    @property
    def effective_cost(self) -> Optional[float]:
        return self.total_monthly_cost if self.total_monthly_cost is not None else self.price


def _load_active_offers(db: Session) -> list[_OfferRow]:
    """Wszystkie oferty brane pod uwagę jako "rynek porównawczy"/potencjalne
    duplikaty - tylko zatwierdzone (widoczne publicznie), niezależnie od
    źródła (olx/landlord)."""
    stmt = select(*(getattr(offers.c, col) for col in _OFFER_COLUMNS)).where(offers.c.status == "approved")
    rows = db.execute(stmt).all()
    return [_OfferRow(**dict(row._mapping)) for row in rows]


def _low_price_warnings(rows: list[_OfferRow]) -> dict[str, dict]:
    groups: dict[tuple, list[float]] = defaultdict(list)
    for row in rows:
        cost = row.effective_cost
        if cost is None or not row.district:
            continue
        key = (row.city, row.category, row.district)
        groups[key].append(cost)

    medians = {
        key: stats_math.safe_median(values)
        for key, values in groups.items()
        if len(values) >= SUSPICIOUS_MIN_SIMILAR_OFFERS
    }

    result: dict[str, dict] = {}
    for row in rows:
        cost = row.effective_cost
        if cost is None or not row.district:
            continue
        key = (row.city, row.category, row.district)
        median = medians.get(key)
        if median is None or median <= 0:
            continue

        ratio = cost / median
        if ratio > (1 - SUSPICIOUS_PRICE_DROP_THRESHOLD):
            continue

        difference_percent = round((cost - median) / median * 100, 1)
        result[row.id] = {
            "type": WARNING_LOW_PRICE,
            "message": "Nietypowa cena - znacznie poniżej mediany",
            "details": {
                "price": cost,
                "median": median,
                "difference_percent": difference_percent,
            },
        }
    return result


def _frequent_price_change_warnings(db: Session, offer_ids: list[str]) -> dict[str, dict]:
    if not offer_ids:
        return {}

    cutoff = (datetime.now(timezone.utc) - timedelta(days=SUSPICIOUS_PRICE_CHANGE_WINDOW_DAYS)).strftime(
        "%Y-%m-%d %H:%M:%S"
    )
    stmt = (
        select(offer_history.c.offer_id, offer_history.c.recorded_at)
        .where(
            offer_history.c.event == "price_changed",
            offer_history.c.recorded_at >= cutoff,
            offer_history.c.offer_id.in_(offer_ids),
        )
    )
    counts: dict[str, int] = defaultdict(int)
    for row in db.execute(stmt).all():
        counts[row.offer_id] += 1

    result: dict[str, dict] = {}
    for offer_id, count in counts.items():
        if count >= SUSPICIOUS_PRICE_CHANGE_MIN_COUNT:
            result[offer_id] = {
                "type": WARNING_FREQUENT_PRICE_CHANGES,
                "message": "Częste zmiany ceny",
                "details": {
                    "changes_count": count,
                    "window_days": SUSPICIOUS_PRICE_CHANGE_WINDOW_DAYS,
                },
            }
    return result


def _text_similarity(a: Optional[str], b: Optional[str]) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.strip().lower(), b.strip().lower()).ratio()


def _duplicate_warnings(rows: list[_OfferRow]) -> dict[str, dict]:
    by_district: dict[Optional[str], list[_OfferRow]] = defaultdict(list)
    for row in rows:
        by_district[row.district].append(row)

    result: dict[str, dict] = {}
    for district, district_rows in by_district.items():
        if district is None or len(district_rows) < 2:
            continue
        for i, row_a in enumerate(district_rows):
            if row_a.id in result:
                continue
            for row_b in district_rows[i + 1:]:
                title_sim = _text_similarity(row_a.title, row_b.title)
                if title_sim < SUSPICIOUS_DUPLICATE_TITLE_SIMILARITY:
                    continue
                description_sim = _text_similarity(row_a.description, row_b.description)
                if description_sim < SUSPICIOUS_DUPLICATE_DESCRIPTION_SIMILARITY:
                    continue

                warning_details = {
                    "duplicate_offer_id": row_b.id,
                    "title_similarity": round(title_sim, 3),
                    "description_similarity": round(description_sim, 3),
                }
                result.setdefault(
                    row_a.id,
                    {
                        "type": WARNING_POSSIBLE_DUPLICATE,
                        "message": "Możliwy duplikat",
                        "details": warning_details,
                    },
                )
                result.setdefault(
                    row_b.id,
                    {
                        "type": WARNING_POSSIBLE_DUPLICATE,
                        "message": "Możliwy duplikat",
                        "details": {
                            "duplicate_offer_id": row_a.id,
                            "title_similarity": round(title_sim, 3),
                            "description_similarity": round(description_sim, 3),
                        },
                    },
                )
                break
    return result


def compute_warnings_for_all_offers(db: Session) -> dict[str, list[dict]]:
    """Zwraca mapę offer_id -> lista ostrzeżeń (może być pusta) dla
    wszystkich zatwierdzonych ofert. Jedno przejście po całym zbiorze -
    używane zarówno przez listę ofert, szczegóły oferty, jak i
    /api/analysis/suspicious, żeby kryteria były zawsze spójne."""
    rows = _load_active_offers(db)
    offer_ids = [row.id for row in rows]

    low_price = _low_price_warnings(rows)
    frequent_changes = _frequent_price_change_warnings(db, offer_ids)
    duplicates = _duplicate_warnings(rows)

    warnings_by_offer: dict[str, list[dict]] = {offer_id: [] for offer_id in offer_ids}
    for source in (low_price, frequent_changes, duplicates):
        for offer_id, warning in source.items():
            warnings_by_offer.setdefault(offer_id, []).append(warning)
    return warnings_by_offer


def get_warnings_for_offer(db: Session, offer_id: str) -> list[dict]:
    """Ostrzeżenia dla pojedynczej oferty (strona szczegółów)."""
    return compute_warnings_for_all_offers(db).get(offer_id, [])


def get_suspicious_offers(db: Session) -> list[dict]:
    """Lista ofert z co najmniej jednym ostrzeżeniem - dane oferty (id,
    title, price, district) + lista ostrzeżeń, do `/api/analysis/suspicious`."""
    rows = _load_active_offers(db)
    warnings_by_offer = compute_warnings_for_all_offers(db)

    rows_by_id = {row.id: row for row in rows}
    result = []
    for offer_id, warnings in warnings_by_offer.items():
        if not warnings:
            continue
        row = rows_by_id[offer_id]
        result.append({
            "id": row.id,
            "title": row.title,
            "city": row.city,
            "district": row.district,
            "price": row.effective_cost,
            "warnings": warnings,
        })
    return result
