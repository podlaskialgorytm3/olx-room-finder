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
# Analiza opiera się na całkowitym koszcie miesięcznym (czynsz + dodatkowe
# opłaty), a nie samej cenie najmu, dlatego cały budżet wagowy poświęcony
# odchyleniu kosztu ("price" + "total_cost" w oryginalnej wersji) trafia
# teraz w całości do "total_cost"; "price" zostaje na 0, ale pole jest
# zachowane, żeby dało się łatwo przywrócić mieszaną wagę bez zmiany kodu.
VALUE_SCORE_WEIGHTS = {
    "price": 0.0,
    "total_cost": 0.8,
    "negotiable_bonus": 0.1,
    "deposit_penalty": 0.1,
}

# Minimalna liczba ofert w dzielnicy, żeby uznać medianę/MAD za wiarygodne
# (poniżej tego progu statystyki dzielnicy są zbyt niestabilne).
MIN_DISTRICT_SAMPLE_SIZE = 5

# Czy backend ma automatycznie uruchamiać w tle harmonogram codziennej
# synchronizacji ofert OLX (patrz backend/services/sync_service.py). Wyłącz
# ustawiając zmienną środowiskową ENABLE_SYNC_SCHEDULER=false (np. w testach).
ENABLE_SYNC_SCHEDULER = os.environ.get("ENABLE_SYNC_SCHEDULER", "true").strip().lower() in (
    "1", "true", "yes", "on",
)
