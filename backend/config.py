"""
Konfiguracja backendu.

DATABASE_URL jest jedynym miejscem, które trzeba zmienić, aby przełączyć się
z SQLite na PostgreSQL (np. "postgresql+psycopg2://user:pass@host/dbname").
Cała reszta logiki biznesowej korzysta z SQLAlchemy i nie zależy od dialektu.
"""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{BASE_DIR / 'data.db'}")

# Domyślne / maksymalne wartości paginacji.
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# Wagi użyte w /api/analysis/value - patrz OPIS METODY w analysis_service.py.
VALUE_SCORE_WEIGHTS = {
    "price": 0.5,
    "total_cost": 0.3,
    "negotiable_bonus": 0.1,
    "deposit_penalty": 0.1,
}

# Minimalna liczba ofert w dzielnicy, żeby uznać medianę/MAD za wiarygodne
# (poniżej tego progu statystyki dzielnicy są zbyt niestabilne).
MIN_DISTRICT_SAMPLE_SIZE = 5
