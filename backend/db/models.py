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

metadata = MetaData()

offers = Table(
    "offers",
    metadata,
    Column("id", String, primary_key=True),
    Column("title", String, nullable=False),
    Column("district", String),
    Column("price", Integer),
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
    Column("created_at", String),
    Column("updated_at", String),
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
