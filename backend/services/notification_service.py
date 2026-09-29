"""
notification_service.py
========================

Dopasowuje nowe/przecenione oferty do aktywnych alertów użytkowników
(`saved_searches`) i tworzy powiadomienia (`notifications`). Wywoływane
wyłącznie z `backend.services.sync_service.sync_once` - po wstawieniu nowej
oferty (`process_new_offer`) i po wykryciu zmiany ceny istniejącej oferty
(`process_price_drop`) - żaden osobny proces nie odpytuje OLX tylko na
potrzeby alertów.

Używa surowego `sqlite3` (przez `sync_service.get_connection`), tak samo jak
reszta warstwy synchronizacji - ta logika działa w wątku harmonogramu, poza
kontekstem żądania FastAPI, więc nie korzysta z sesji SQLAlchemy per-request.

Architektura jest przygotowana pod wiele kanałów powiadomień (in-app, e-mail,
Telegram, Discord, push) - na MVP zaimplementowany jest tylko kanał in-app
(sam zapis wiersza w `notifications` już nim jest). Kolejne kanały dopisuje
się do listy `CHANNELS` bez zmiany logiki dopasowywania poniżej.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import closing
from typing import Any, Protocol

from backend.services.sync_service import get_connection

logger = logging.getLogger(__name__)

TYPE_NEW_OFFER = "NEW_OFFER"
TYPE_PRICE_DROP = "PRICE_DROP"
TYPE_OFFER_REMOVED = "OFFER_REMOVED"

_SAVED_SEARCH_COLUMNS = (
    "id", "user_id", "name", "city_id", "category", "districts", "min_price", "max_price",
    "min_area", "max_area", "source", "notification_enabled", "notify_new_offers", "notify_price_drops",
)


class NotificationChannel(Protocol):
    def send(self, user_id: int, title: str, message: str) -> None: ...  # pragma: no cover


class InAppChannel:
    """Powiadomienie w aplikacji - materializowane jako wiersz w
    `notifications` (patrz `_create_notification`), więc ten kanał nie robi
    nic dodatkowego. Jest tu wyłącznie po to, żeby lista `CHANNELS` była
    kompletna i gotowa na kolejne kanały."""

    def send(self, user_id: int, title: str, message: str) -> None:
        return None


CHANNELS: list[NotificationChannel] = [InAppChannel()]


def _row_to_search(row: tuple) -> dict[str, Any]:
    return dict(zip(_SAVED_SEARCH_COLUMNS, row))


def _active_saved_searches_for_offer(
    conn: sqlite3.Connection, city: str, category: str
) -> list[dict[str, Any]]:
    """Alerty aktywne (`notification_enabled=1`), których zakres miasta i
    kategorii nie wyklucza tej oferty - dopasowanie po dzielnicy/cenie/
    powierzchni/źródle robi `_offer_matches`."""
    rows = conn.execute(
        f"""
        SELECT {', '.join(_SAVED_SEARCH_COLUMNS)} FROM saved_searches
        WHERE notification_enabled = 1
          AND (city_id IS NULL OR city_id = ?)
          AND (category IS NULL OR category = ?)
        """,
        (city, category),
    ).fetchall()
    return [_row_to_search(row) for row in rows]


def _offer_matches(search: dict[str, Any], offer: dict[str, Any]) -> bool:
    """Sprawdza kryteria alertu (`saved_searches`) względem oferty. Pola
    None w alercie oznaczają "bez ograniczenia"."""
    price = offer.get("price")
    if search["min_price"] is not None and (price is None or price < search["min_price"]):
        return False
    if search["max_price"] is not None and (price is None or price > search["max_price"]):
        return False

    area = offer.get("area_m2")
    if search["min_area"] is not None and (area is None or area < search["min_area"]):
        return False
    if search["max_area"] is not None and (area is None or area > search["max_area"]):
        return False

    if search["source"] and offer.get("source") != search["source"]:
        return False

    districts_raw = search.get("districts")
    if districts_raw:
        try:
            districts = json.loads(districts_raw)
        except (json.JSONDecodeError, TypeError):
            districts = []
        if districts and offer.get("district") not in districts:
            return False

    return True


def _create_notification(
    conn: sqlite3.Connection,
    user_id: int,
    saved_search_id: int,
    offer_id: str,
    type_: str,
    title: str,
    message: str,
) -> bool:
    """Wstawia powiadomienie, chyba że identyczne (saved_search_id, offer_id,
    type) już istnieje - zwraca True, jeśli utworzono nowy wpis."""
    try:
        conn.execute(
            "INSERT INTO notifications (user_id, saved_search_id, offer_id, type, title, message) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, saved_search_id, offer_id, type_, title, message),
        )
        return True
    except sqlite3.IntegrityError:
        # Powiadomienie o tej samej ofercie/alercie/typie już istnieje.
        return False


def _format_price(value: Any) -> str:
    if value is None:
        return "cena nieznana"
    return f"{int(value)} zł" if float(value) == int(value) else f"{value} zł"


def process_new_offer(offer_row: dict[str, Any], city: str, category: str) -> int:
    """Tworzy powiadomienia NEW_OFFER dla wszystkich aktywnych alertów
    pasujących do nowo dodanej oferty. Zwraca liczbę utworzonych powiadomień
    (bez duplikatów)."""
    created = 0
    with closing(get_connection()) as conn:
        for search in _active_saved_searches_for_offer(conn, city, category):
            if not search["notify_new_offers"]:
                continue
            if not _offer_matches(search, offer_row):
                continue

            area_txt = f"{offer_row['area_m2']:g} m² — " if offer_row.get("area_m2") else ""
            title = "🆕 Nowa oferta pasująca do Twojego alertu"
            message = f"{area_txt}{offer_row.get('district') or '-'}\n{_format_price(offer_row.get('price'))}"

            if _create_notification(
                conn, search["user_id"], search["id"], offer_row["id"], TYPE_NEW_OFFER, title, message
            ):
                created += 1
                for channel in CHANNELS:
                    channel.send(search["user_id"], title, message)
        conn.commit()
    if created:
        logger.info("Utworzono %d powiadomień NEW_OFFER dla oferty id=%s.", created, offer_row.get("id"))
    return created


def process_price_drop(
    offer_row: dict[str, Any], old_price: float, new_price: float, city: str, category: str
) -> int:
    """Tworzy powiadomienia PRICE_DROP dla alertów pasujących do oferty,
    której cena spadła. Nie robi nic, jeśli cena wzrosła lub się nie
    zmieniła - to wywołujący (`sync_service`) odpowiada za wykrycie zmiany,
    tu jest tylko dodatkowe zabezpieczenie."""
    if old_price is None or new_price is None or new_price >= old_price:
        return 0

    diff = old_price - new_price
    pct = (diff / old_price * 100) if old_price else 0
    created = 0
    with closing(get_connection()) as conn:
        for search in _active_saved_searches_for_offer(conn, city, category):
            if not search["notify_price_drops"]:
                continue
            if not _offer_matches(search, offer_row):
                continue

            title = "📉 Spadek ceny"
            message = (
                f"{offer_row.get('district') or '-'}\n"
                f"{_format_price(old_price)} → {_format_price(new_price)}\n"
                f"Cena spadła o {int(diff)} zł (-{pct:.1f}%)."
            )

            if _create_notification(
                conn, search["user_id"], search["id"], offer_row["id"], TYPE_PRICE_DROP, title, message
            ):
                created += 1
                for channel in CHANNELS:
                    channel.send(search["user_id"], title, message)
        conn.commit()
    if created:
        logger.info("Utworzono %d powiadomień PRICE_DROP dla oferty id=%s.", created, offer_row.get("id"))
    return created
