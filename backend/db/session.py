"""
Silnik i sesje SQLAlchemy. To jedyne miejsce, w którym tworzony jest
`Engine` - dzięki temu zmiana bazy danych (SQLite -> PostgreSQL) sprowadza
się do zmiany `DATABASE_URL` w config.py / zmiennej środowiskowej.
"""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from backend.config import DATABASE_URL

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine: Engine = create_engine(DATABASE_URL, connect_args=_connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    """Dependency FastAPI dostarczające sesję SQLAlchemy per-request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
