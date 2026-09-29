"""
Deklaracje tabel SQLAlchemy Core.

Schemat bazy jest tworzony/migrowany przez `backend/services/sync_service.py`
(funkcja `init_db()`), uruchamiane automatycznie przy starcie backendu.
Poniższe deklaracje `Table` służą wyłącznie do budowania zapytań w
niezależny od dialektu sposób (SQLite dziś, PostgreSQL w przyszłości bez
zmian w kodzie zapytań).
"""

from __future__ import annotations

from sqlalchemy import (
    Column,
    Integer,
    MetaData,
    Float,
    String,
    Table,
    Text,
)
from sqlalchemy import UniqueConstraint

metadata = MetaData()

offers = Table(
    "offers",
    metadata,
    Column("id", String, primary_key=True),
    Column("title", String, nullable=False),
    Column("city", String),
    Column("category", String, nullable=False, default="room"),  # 'room' (pokój) | 'apartment' (mieszkanie)
    Column("district", String),
    Column("price", Integer),
    Column("area_m2", Float),  # powierzchnia w m2 (może mieć miejsca po przecinku)
    Column("negotiable", Integer),  # 0/1
    Column("link", String),
    Column("description", Text),
    Column("address", String),
    Column("additional_cost", Float),
    Column("has_additional_cost", Integer),  # 0/1/NULL (tri-state)
    Column("deposit", Float),
    Column("has_deposit_cost", Integer),  # 0/1/NULL
    Column("has_deposit", Integer),  # 0/1/NULL
    Column("total_monthly_cost", Float),
    Column("photos", Text),  # JSON zserializowany jako string
    Column("views_count", Integer, nullable=False, default=0),  # licznik wyświetleń szczegółów oferty
    Column("created_at", String),
    Column("updated_at", String),
    Column("status", String, nullable=False, default="approved"),  # 'pending' | 'approved' | 'rejected'
    Column("source", String, nullable=False, default="olx"),  # 'olx' | 'landlord'
    Column("owner_user_id", Integer),  # id z tabeli `users`, tylko dla source='landlord'
    Column("rejection_reason", Text),  # powód odrzucenia przez administratora (source='landlord')
)

offer_history = Table(
    "offer_history",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("offer_id", String, nullable=False),
    Column("district", String),
    Column("price", Integer),
    Column("total_monthly_cost", Float),
    Column("event", String, nullable=False),  # 'created' | 'removed' | 'price_changed'
    Column("recorded_at", String, nullable=False),
)

sync_runs = Table(
    "sync_runs",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("started_at", String, nullable=False),
    Column("finished_at", String),
    Column("offers_seen", Integer),
    Column("offers_added", Integer),
    Column("offers_removed", Integer),
    Column("max_page", Integer),
)

favorites = Table(
    "favorites",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("user_id", Integer, nullable=False),
    Column("offer_id", String, nullable=False),
    Column("created_at", String),
)

saved_searches = Table(
    "saved_searches",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("user_id", Integer, nullable=False),
    Column("name", String, nullable=False),
    Column("city_id", String),
    Column("category", String),  # 'room' | 'apartment' | NULL (dowolna)
    Column("districts", Text),  # JSON zserializowany jako string, np. '["Mokotów"]'
    Column("min_price", Float),
    Column("max_price", Float),
    Column("min_area", Float),
    Column("max_area", Float),
    Column("source", String),  # 'olx' | 'landlord' | NULL (dowolne)
    Column("notification_enabled", Integer, nullable=False, default=1),  # 0/1 - status alertu
    Column("notify_new_offers", Integer, nullable=False, default=1),
    Column("notify_price_drops", Integer, nullable=False, default=1),
    Column("created_at", String),
    Column("updated_at", String),
    Column("last_checked_at", String),
)

notifications = Table(
    "notifications",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("user_id", Integer, nullable=False),
    Column("saved_search_id", Integer),
    Column("offer_id", String),
    Column("type", String, nullable=False),  # 'NEW_OFFER' | 'PRICE_DROP' | 'OFFER_REMOVED'
    Column("title", String, nullable=False),
    Column("message", Text, nullable=False),
    Column("is_read", Integer, nullable=False, default=0),  # 0/1
    Column("created_at", String),
    UniqueConstraint("saved_search_id", "offer_id", "type", name="uq_notifications_search_offer_type"),
)
