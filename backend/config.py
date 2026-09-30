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

# --- Wykrywanie podejrzanych ofert (patrz backend/services/suspicious_offers_service.py) ---
# Minimalna liczba podobnych ofert (to samo miasto/kategoria/dzielnica),
# żeby uznać medianę za wiarygodną podstawę do oznaczenia niskiej ceny.
# Poniżej tego progu nigdy nie oznaczamy oferty na podstawie ceny.
SUSPICIOUS_MIN_SIMILAR_OFFERS = 5

# Próg "podejrzanie niskiej ceny" - o ile procent (ułamek) cena oferty musi
# być niższa od mediany podobnych ofert, żeby ją oznaczyć (0.4 = 40%).
SUSPICIOUS_PRICE_DROP_THRESHOLD = 0.4

# "Częste zmiany ceny": co najmniej tyle zdarzeń 'price_changed' w
# `offer_history` w oknie czasowym poniżej.
SUSPICIOUS_PRICE_CHANGE_MIN_COUNT = 3
SUSPICIOUS_PRICE_CHANGE_WINDOW_DAYS = 7

# Wykrywanie potencjalnych duplikatów - progi podobieństwa tekstu (0-1,
# SequenceMatcher.ratio()) tytułu i opisu; dzielnica musi być identyczna.
SUSPICIOUS_DUPLICATE_TITLE_SIMILARITY = 0.85
SUSPICIOUS_DUPLICATE_DESCRIPTION_SIMILARITY = 0.85

# Czy backend ma automatycznie uruchamiać w tle harmonogram codziennej
# synchronizacji ofert OLX (patrz backend/services/sync_service.py). Wyłącz
# ustawiając zmienną środowiskową ENABLE_SYNC_SCHEDULER=false (np. w testach).
ENABLE_SYNC_SCHEDULER = os.environ.get("ENABLE_SYNC_SCHEDULER", "true").strip().lower() in (
    "1", "true", "yes", "on",
)

# Maksymalna liczba aktywnych alertów ofertowych (`saved_searches` z
# `notification_enabled=1`) na jednego użytkownika - patrz
# `backend/routers/saved_searches.py`.
MAX_ACTIVE_SAVED_SEARCHES_PER_USER = 20

# --- "Sprawdź dojazd" (patrz backend/services/routing_service.py) ---------
# Adres usługi geokodowania (zamiana adresu/nazwy miejsca na lat/lng).
# Nominatim (OpenStreetMap) - darmowe, bez klucza API.
GEOCODING_BASE_URL = os.environ.get("GEOCODING_BASE_URL", "https://nominatim.openstreetmap.org/search")
GEOCODING_USER_AGENT = os.environ.get("GEOCODING_USER_AGENT", "olx-room-finder/1.0 (dojazd)")

# Adres publicznego serwera OSRM użytego do policzenia realnej odległości
# drogowej między ofertą a miejscem docelowym (profil pieszy - najbliższy
# darmowy odpowiednik tras miejskich bez potrzeby klucza API/danych GTFS).
ROUTING_BASE_URL = os.environ.get("ROUTING_BASE_URL", "https://router.project-osrm.org/route/v1/foot")

# Timeout (s) pojedynczego zapytania do usług geokodowania/routingu.
ROUTING_HTTP_TIMEOUT = float(os.environ.get("ROUTING_HTTP_TIMEOUT", "10"))

# MVP wspiera tylko komunikację publiczną, a darmowe API tras transitowych
# (GTFS) nie jest tu dostępne bez płatnego klucza. Odległość liczymy realnie
# (sieć dróg z OSRM), a czas dojazdu komunikacją publiczną szacujemy na
# podstawie tej odległości: średnia prędkość "od drzwi do drzwi" (włącznie z
# oczekiwaniem/przesiadkami) w polskich miastach + stały czas oczekiwania na
# pierwszy przystanek. Łatwo podmienić na prawdziwe API transitowe (Google
# Directions transit, OpenTripPlanner) bez zmiany interfejsu RoutingService.
PUBLIC_TRANSPORT_AVG_SPEED_KMH = float(os.environ.get("PUBLIC_TRANSPORT_AVG_SPEED_KMH", "18"))
PUBLIC_TRANSPORT_WAIT_MIN = float(os.environ.get("PUBLIC_TRANSPORT_WAIT_MIN", "5"))

