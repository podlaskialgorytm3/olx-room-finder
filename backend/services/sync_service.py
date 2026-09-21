"""
sync_service.py
================

Usługa synchronizacji ofert OLX (pokoje/stancje, Warszawa) z lokalną bazą
danych SQLite (`data.db`). Dawniej samodzielny skrypt `daily_sync.py`,
obecnie część tego samego procesu backendowego co REST API - dzięki temu
całość (scraping, analiza AI, serwowanie danych) działa jako jeden system.

Zawiera całą logikę, która wcześniej była podzielona na main.py (scraping
listingu + opisów), room_analysis.py (analiza opisu przez lokalny model AI
w Ollamie) i fetch_photos.py (pobieranie zdjęć z galerii ogłoszenia).

Działanie:
- `start_background_scheduler()` uruchamia w tle wątek demona, który co noc
  o godzinie 2:00 wykonuje pełną synchronizację (patrz `sync_once`):
    1. Pobiera aktualną listę ogłoszeń z OLX (podstawowe pola - id, tytuł,
       dzielnica, cena, link) ze wszystkich stron listingu.
    2. Porównuje zbiór ID z tym, co jest już w bazie danych.
    3. Dla ID, których nie ma jeszcze w bazie (nowe ogłoszenia) - pobiera
       pełny opis, analizę AI (adres / dodatkowe koszty / kaucja) oraz
       zdjęcia, po czym wstawia kompletny rekord (pojedynczy INSERT, bez
       przepisywania całej tabeli).
    4. Dla ID, które są w bazie, ale zniknęły z OLX (nieaktualne
       ogłoszenia) - usuwa odpowiadające im rekordy (pojedynczy DELETE).
    5. Istniejące, niezmienione rekordy nigdy nie są ponownie odpytywane
       ani przepisywane - synchronizacja tylko dokłada nowe i usuwa
       zniknięte wiersze.
- `trigger_manual_sync()` pozwala uruchomić synchronizację od razu (np. na
  żądanie endpointu `POST /api/sync/run`), bez czekania na harmonogram.
- Przy pierwszym uruchomieniu, jeśli baza `data.db` jeszcze nie istnieje,
  a obok leży stary plik `data.csv`, program jednorazowo migruje jego
  zawartość do bazy (patrz `migrate_legacy_csv_if_needed`).
"""

from __future__ import annotations

import csv
import json
import logging
import re
import sqlite3
import subprocess
import sys
import threading
import time
from contextlib import closing
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urljoin, urlparse, urlsplit, urlunsplit

import requests
from bs4 import BeautifulSoup, Tag

from backend.config import BASE_DIR

# ==========================================================================
# KONFIGURACJA
# ==========================================================================

BASE_URL = "https://www.olx.pl"
LISTING_URL = f"{BASE_URL}/nieruchomosci/stancje-pokoje/warszawa/"

DB_FILE = str(BASE_DIR / "data.db")
LEGACY_CSV_FILE = str(BASE_DIR / "data.csv")  # do jednorazowej migracji, jeśli baza jeszcze nie istnieje
LOG_FILE = str(BASE_DIR / "daily_sync.log")

RUN_HOUR = 2
RUN_MINUTE = 0

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/128.0.0.0 Safari/537.36"
    )
}

# --- scraping listingu / opisów ---
DESCRIPTION_REQUEST_DELAY_SECONDS = 1.5
DESCRIPTION_MAX_RETRIES = 3
OVERLOAD_MARKERS = (
    "nasze serwery są trochę przeciążone",
    "spróbuj ponownie za chwilę",
)

# --- zdjęcia ---
PHOTOS_MAX_RETRIES = 3
PHOTOS_RETRY_BACKOFF_SECONDS = 5

# --- analiza AI (Ollama) ---
MODEL_NAME = "llama3.2:3b"
OLLAMA_URL = "http://localhost:11434/api/generate"
ANALYSIS_MAX_RETRIES = 2
ANALYSIS_REQUEST_TIMEOUT = 300
ANALYSIS_RETRY_BACKOFF_SECONDS = 10
REQUIRED_MODEL_FIELDS = [
    "address",
    "additional_cost",
    "has_additional_cost",
    "deposit",
    "has_deposit_cost",
    "has_deposit",
]

# Opóźnienie między przetwarzaniem kolejnych NOWYCH ofert w trakcie jednej synchronizacji.
NEW_OFFER_REQUEST_DELAY_SECONDS = 1.5

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


@dataclass
class RoomOffer:
    id: str
    title: str
    district: str
    price: int
    negotiable: bool
    link: str
    description: str = ""


# ==========================================================================
# SCRAPING LISTINGU I OPISÓW (dawniej main.py)
# ==========================================================================

def fetch_html(url: str) -> str:
    response = requests.get(url, headers=HEADERS, timeout=30)
    if response.ok:
        return response.text

    curl_result = subprocess.run(
        ["curl", "-L", "-A", HEADERS["User-Agent"], "--compressed", url],
        check=True,
        capture_output=True,
        text=True,
    )
    return curl_result.stdout


def get_max_page_number(soup: BeautifulSoup) -> int:
    pagination = soup.select_one("ul.ZCqQQ")
    if pagination is None:
        return 1

    page_numbers: list[int] = []
    for link in pagination.select('a[href*="?page="]'):
        text = link.get_text(strip=True)
        if text.isdigit():
            page_numbers.append(int(text))

    return max(page_numbers, default=1)


def extract_district(location_text: str) -> str:
    location = location_text.split(" - ", maxsplit=1)[0].strip()
    parts = [part.strip() for part in location.split(",")]
    if len(parts) >= 2:
        return parts[1]
    return parts[0] if parts else ""


def parse_price(price_text: str) -> tuple[int, bool]:
    normalized_price = price_text.lower()
    negotiable = "do negocjacji" in normalized_price
    digits = re.sub(r"\D", "", price_text)
    if not digits:
        raise ValueError("Missing numeric price in listing card.")
    return int(digits), negotiable


def normalize_description_text(text: str) -> str:
    cleaned = text.replace("\xa0", " ")
    cleaned = re.sub(r"\r\n?", "\n", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"[ \t]+\n", "\n", cleaned)
    cleaned = re.sub(r"\n[ \t]+", "\n", cleaned)
    return "\n".join(line.strip() for line in cleaned.splitlines() if line.strip()).strip()


def is_overload_response(html: str) -> bool:
    lowered = html.lower()
    return any(marker in lowered for marker in OVERLOAD_MARKERS)


def extract_description_from_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    candidate_selectors = [
        "div.css-fl29zg",
        "div[data-testid='description']",
        "div[data-cy='ad_description']",
        "div[data-testid='descriptionContent']",
        "div[data-testid='ad-description']",
        "[class*='description']",
        "article",
    ]

    for selector in candidate_selectors:
        element = soup.select_one(selector)
        if not element:
            continue
        description = element.get_text("\n", strip=False)
        if description and len(description.strip()) > 10:
            return normalize_description_text(description)

    meta_description = soup.select_one('meta[name="description"]')
    if meta_description and meta_description.get("content"):
        description = meta_description["content"]
        if description.strip():
            return normalize_description_text(description)

    return ""


def fetch_offer_description(link: str) -> str:
    for attempt in range(1, DESCRIPTION_MAX_RETRIES + 1):
        try:
            html = fetch_html(link)
        except Exception:
            return ""

        if is_overload_response(html):
            if attempt < DESCRIPTION_MAX_RETRIES:
                time.sleep(DESCRIPTION_REQUEST_DELAY_SECONDS * attempt)
                continue
            return ""

        return extract_description_from_html(html)

    return ""


def parse_card(card: Tag) -> RoomOffer:
    title_link = card.select_one('[data-testid="card-title-link"]')
    if title_link is None:
        raise ValueError("Missing title link in listing card.")

    title_element = title_link.select_one("h4")
    price_element = card.select_one('[data-testid="ad-price"]')
    location_element = card.select_one('[data-testid="location-date"]')

    if title_element is None or price_element is None or location_element is None:
        raise ValueError("Missing title, price or location in listing card.")

    offer_id = card.get("id")
    if offer_id is None:
        path = urlparse(title_link["href"]).path.rstrip("/")
        offer_id = path.split("-")[-1] if path else ""

    if not offer_id:
        raise ValueError("Missing id in listing card.")

    price, negotiable = parse_price(price_element.get_text(" ", strip=True))

    return RoomOffer(
        id=offer_id,
        title=title_element.get_text(strip=True),
        district=extract_district(location_element.get_text(" ", strip=True)),
        price=price,
        negotiable=negotiable,
        link=urljoin(BASE_URL, title_link["href"]),
    )


def parse_offers(html: str) -> list[RoomOffer]:
    soup = BeautifulSoup(html, "html.parser")
    offers: list[RoomOffer] = []

    for card in soup.select('[data-cy="l-card"]'):
        try:
            offers.append(parse_card(card))
        except ValueError:
            continue

    return offers


def build_page_url(page_number: int) -> str:
    if page_number == 1:
        return LISTING_URL
    return f"{LISTING_URL}?page={page_number}"


def fetch_all_offers() -> tuple[list[RoomOffer], int]:
    html = fetch_html(LISTING_URL)
    soup = BeautifulSoup(html, "html.parser")
    max_page = get_max_page_number(soup)
    offers = parse_offers(html)

    for page_number in range(2, max_page + 1):
        page_html = fetch_html(build_page_url(page_number))
        offers.extend(parse_offers(page_html))

    return offers, max_page


# ==========================================================================
# ANALIZA AI PRZEZ LOKALNĄ OLLAMĘ (dawniej room_analysis.py)
# ==========================================================================

def create_prompt(title: str, price: str, description: str) -> str:
    instructions = """Jesteś lokalnym modelem AI służącym do ekstrakcji danych z polskich ogłoszeń wynajmu pokoi.

Przeanalizuj semantycznie cały opis ogłoszenia. Nie ograniczaj się do wyszukiwania pojedynczych słów kluczowych.

Twoim zadaniem jest wyodrębnienie:

1. address
2. additional_cost
3. has_additional_cost
4. deposit
5. has_deposit_cost
6. has_deposit

### ADDRESS

Znajdź adres podany bezpośrednio w ogłoszeniu.

Nie zgaduj adresu na podstawie dzielnicy, przystanków, sklepów lub innych informacji.

Jeżeli adresu nie ma → null.

### ADDITIONAL_COST

Znajdź wszystkie dodatkowe CYKLICZNE miesięczne opłaty poza podstawową ceną wynajmu.

Uwzględniaj między innymi:

* czynsz administracyjny,
* media,
* prąd,
* wodę,
* gaz,
* ogrzewanie,
* internet,
* śmieci,
* inne stałe miesięczne opłaty.

Jeżeli kilka opłat ma podaną konkretną kwotę, zsumuj je.

Przykład:

"1200 zł + czynsz 300 zł + internet 50 zł"

→ additional_cost = 350

Przykład:

"1200 zł + media 150 zł"

→ additional_cost = 150

Jeżeli wszystkie dodatkowe koszty są zawarte w cenie:

"1750 zł całkowity koszt, wszystkie media w cenie"

→ additional_cost = 0

Jeżeli dodatkowe koszty istnieją, ale ich kwota nie jest znana:

"1800 zł + media według zużycia"

→ additional_cost = null

Nie zgaduj wysokości nieznanych opłat.

Jeżeli część opłat jest znana, a część zależy od zużycia, zsumuj tylko znane kwoty.

Przykład:

"1200 zł + internet 50 zł + prąd według zużycia"

→ additional_cost = 50

Kaucja nie jest dodatkową miesięczną opłatą i nie może być uwzględniona w additional_cost.

### HAS_ADDITIONAL_COST

true — jeżeli istnieją dodatkowe cykliczne opłaty poza podstawową ceną.

false — jeżeli ogłoszenie wyraźnie informuje, że wszystkie opłaty są zawarte w cenie albo nie ma dodatkowych opłat.

null — jeżeli nie można tego ustalić.

### DEPOSIT

Znajdź konkretną kwotę kaucji.

"Kaucja 1300 zł" → 1300

"Kaucja 1500 zł" → 1500

"Kaucja jednomiesięczny czynsz" → null

"Kaucja do ustalenia" → null

Nie zgaduj kwoty.

### HAS_DEPOSIT_COST

true — jeżeli konkretna kwota kaucji została podana.

false — jeżeli ogłoszenie wyraźnie mówi, że kaucji nie ma.

null — jeżeli kaucja jest wspomniana, ale nie ma konkretnej kwoty.

### HAS_DEPOSIT

true — jeżeli ogłoszenie wspomina o wymaganej lub istniejącej kaucji.

false — jeżeli ogłoszenie wyraźnie mówi, że kaucji nie ma.

null — jeżeli ogłoszenie w ogóle nie zawiera informacji o kaucji.

### ZASADY

Nigdy nie wymyślaj informacji.

Brak informacji oznacza `null`, a nie `false`.

"Kaucja do ustalenia" oznacza:

has_deposit = true
has_deposit_cost = null
deposit = null

"Kaucja jednomiesięczny czynsz" oznacza:

has_deposit = true
has_deposit_cost = null
deposit = null

"Brak kaucji" oznacza:

has_deposit = false
has_deposit_cost = false
deposit = null

"Media według zużycia" bez podanej kwoty oznacza:

has_additional_cost = true
additional_cost = null

Wszystkie wartości pieniężne zwracaj jako liczby bez symbolu waluty.

### UWAGA O ZAPISIE LICZB

W polskich ogłoszeniach liczby często mają spację jako separator tysięcy, np. "1 600 PLN" oznacza 1600 (a nie 1 i 600 osobno, ani sumę różnych liczb).

Jeżeli ogłoszenie podaje najpierw cenę podstawową (czynsz) osobno, a potem kwotę "razem"/"łącznie", to:
- kwota podstawowa (czynsz) odpowiada cenie z pola "Cena podstawowa" podanego na początku promptu — NIE licz jej ponownie jako additional_cost,
- additional_cost to różnica pomiędzy kwotą "razem"/"łącznie" a ceną podstawową (czyli same dodatkowe opłaty typu media/ryczałt), a jeśli te opłaty są wprost wymienione z osobną kwotą (np. "ryczałt media 350 PLN"), użyj tej wprost podanej kwoty.
- liczba przy słowie "kaucja" to deposit — nie myl jej z czynszem ani z kwotą "razem".

### PRZYKŁADY (fragment opisu → poprawny wynik JSON)

Przykład 1.
Cena podstawowa: 1250
Fragment opisu: "Czynsz 1 250 Pln + ryczałt media 350 Pln razem 1 600 PLN / kaucja 1 600 Pln"
Wynik:
{"address": null, "additional_cost": 350, "has_additional_cost": true, "deposit": 1600, "has_deposit_cost": true, "has_deposit": true}

Przykład 2.
Cena podstawowa: 1800
Fragment opisu: "Cena 1800 zł + media wg zużycia. Kaucja do ustalenia."
Wynik:
{"address": null, "additional_cost": null, "has_additional_cost": true, "deposit": null, "has_deposit_cost": null, "has_deposit": true}

Przykład 3.
Cena podstawowa: 1750
Fragment opisu: "1750 zł, wszystkie opłaty wliczone w cenę. Mieszkanie przy ul. Puławskiej 12. Bez kaucji."
Wynik:
{"address": "ul. Puławska 12", "additional_cost": 0, "has_additional_cost": false, "deposit": null, "has_deposit_cost": false, "has_deposit": false}

Przykład 4.
Cena podstawowa: 1400
Fragment opisu: "Pokój na Mokotowie blisko metra Wilanowska. Cena 1400 zł + internet 40 zł + prąd wg zużycia. Kaucja w wysokości jednomiesięcznego czynszu."
Wynik:
{"address": null, "additional_cost": 40, "has_additional_cost": true, "deposit": null, "has_deposit_cost": null, "has_deposit": true}

Zwróć uwagę, że w przykładzie 4 "Mokotów" i "metro Wilanowska" NIE są adresem (to dzielnica/przystanek), dlatego address = null.

### FORMAT ODPOWIEDZI

Zwróć WYŁĄCZNIE poprawny JSON:

{
"address": null,
"additional_cost": null,
"has_additional_cost": null,
"deposit": null,
"has_deposit_cost": null,
"has_deposit": null
}

Nie dodawaj żadnego tekstu przed JSON-em ani po JSON-ie."""

    listing_data = f"""

### OGŁOSZENIE DO ANALIZY

Tytuł: {title}
Cena podstawowa: {price}
Opis:
{description}
"""

    return instructions + listing_data


def _extract_json(raw_text: str) -> Optional[dict[str, Any]]:
    raw_text = raw_text.strip()
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        pass

    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start != -1 and end != -1 and end > start:
        snippet = raw_text[start:end + 1]
        try:
            return json.loads(snippet)
        except json.JSONDecodeError:
            return None
    return None


def query_ollama(prompt: str) -> Optional[dict[str, Any]]:
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0,
            "num_ctx": 8192,
            "num_predict": 300,
        },
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=ANALYSIS_REQUEST_TIMEOUT)
        response.raise_for_status()
    except requests.exceptions.ConnectionError:
        logger.error("Nie można połączyć się z Ollama (%s). Czy usługa jest uruchomiona?", OLLAMA_URL)
        return None
    except requests.exceptions.Timeout:
        logger.error("Przekroczono limit czasu oczekiwania na odpowiedź Ollama.")
        return None
    except requests.exceptions.RequestException as exc:
        logger.error("Błąd żądania do Ollama: %s", exc)
        return None

    try:
        body = response.json()
        raw_answer = body.get("response", "")
    except (ValueError, AttributeError) as exc:
        logger.error("Niepoprawna odpowiedź HTTP od Ollama: %s", exc)
        return None

    return _extract_json(raw_answer)


def validate_result(result: Optional[dict[str, Any]]) -> bool:
    if not isinstance(result, dict):
        return False
    return all(field in result for field in REQUIRED_MODEL_FIELDS)


def analyze_listing(title: str, price: str, description: str) -> dict[str, Any]:
    prompt = create_prompt(title, price, description)

    attempt = 0
    while attempt <= ANALYSIS_MAX_RETRIES:
        result = query_ollama(prompt)
        if validate_result(result):
            return {field: result[field] for field in REQUIRED_MODEL_FIELDS}

        attempt += 1
        if attempt <= ANALYSIS_MAX_RETRIES:
            delay = ANALYSIS_RETRY_BACKOFF_SECONDS * attempt
            logger.warning(
                "Niepoprawna odpowiedź modelu, próba %d/%d... (czekam %ds)",
                attempt, ANALYSIS_MAX_RETRIES, delay,
            )
            time.sleep(delay)

    logger.error("Nie udało się uzyskać poprawnej odpowiedzi dla ogłoszenia: '%s'", title)
    return {field: None for field in REQUIRED_MODEL_FIELDS}


def _to_number(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        return float(str(value).replace(",", ".").strip())
    except (ValueError, TypeError):
        return None


def calculate_total_cost(price: Any, additional_cost: Any) -> Optional[float]:
    price_num = _to_number(price)
    additional_num = _to_number(additional_cost)

    if price_num is None or additional_num is None:
        return None

    total = price_num + additional_num
    return int(total) if total == int(total) else total


# ==========================================================================
# ZDJĘCIA Z GALERII OGŁOSZENIA (dawniej fetch_photos.py)
# ==========================================================================

def strip_size_suffix(src: str) -> str:
    parts = urlsplit(src)
    path = re.sub(r";s=\d+x\d+$", "", parts.path)
    return urlunsplit((parts.scheme, parts.netloc, path, parts.query, parts.fragment))


def extract_photos_from_html(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    photos: list[str] = []
    seen: set[str] = set()

    slides = soup.select('[data-testid="ad-photo"]')
    for slide in slides:
        img = slide.select_one("img[src]")
        if img is None:
            continue
        src = img.get("src", "").strip()
        if not src:
            continue
        normalized = strip_size_suffix(src)
        if normalized in seen:
            continue
        seen.add(normalized)
        photos.append(normalized)

    return photos


def fetch_offer_photos(link: str) -> list[str]:
    if not link:
        return []

    for attempt in range(1, PHOTOS_MAX_RETRIES + 1):
        try:
            html = fetch_html(link)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Błąd pobierania zdjęć %s: %s", link, exc)
            if attempt < PHOTOS_MAX_RETRIES:
                time.sleep(PHOTOS_RETRY_BACKOFF_SECONDS * attempt)
                continue
            return []

        if is_overload_response(html):
            if attempt < PHOTOS_MAX_RETRIES:
                time.sleep(PHOTOS_RETRY_BACKOFF_SECONDS * attempt)
                continue
            return []

        return extract_photos_from_html(html)

    return []


# ==========================================================================
# WARSTWA BAZY DANYCH (SQLite)
# ==========================================================================

SCHEMA = """
CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'WARSZAWA',
    district TEXT,
    price INTEGER,
    negotiable INTEGER,
    link TEXT,
    description TEXT,
    address TEXT,
    additional_cost REAL,
    has_additional_cost INTEGER,
    deposit REAL,
    has_deposit_cost INTEGER,
    has_deposit INTEGER,
    total_monthly_cost REAL,
    photos TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_offers_district ON offers(district);

-- Historia zdarzeń pojedynczych ofert (utworzenie / usunięcie / w przyszłości
-- zmiana ceny). Rekordy nigdy nie są modyfikowane ani kasowane, więc pozwala
-- to analizować rynek w czasie nawet po usunięciu oferty z tabeli `offers`.
CREATE TABLE IF NOT EXISTS offer_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    offer_id TEXT NOT NULL,
    district TEXT,
    price INTEGER,
    total_monthly_cost REAL,
    event TEXT NOT NULL,  -- 'created' | 'removed' | 'price_changed'
    recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_history_offer_id ON offer_history(offer_id);
CREATE INDEX IF NOT EXISTS idx_history_recorded_at ON offer_history(recorded_at);

-- Log każdego przebiegu synchronizacji - potrzebny do analizy np. liczby
-- nowych/usuniętych ofert w czasie (nie da się tego wyliczyć retrospektywnie
-- z samej tabeli `offers`, bo usunięte wiersze znikają).
CREATE TABLE IF NOT EXISTS sync_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    offers_seen INTEGER,
    offers_added INTEGER,
    offers_removed INTEGER,
    max_page INTEGER
);
"""

OFFER_COLUMNS = [
    "id", "title", "city", "district", "price", "negotiable", "link", "description",
    "address", "additional_cost", "has_additional_cost", "deposit",
    "has_deposit_cost", "has_deposit", "total_monthly_cost", "photos",
]


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _parse_bool(value: Any) -> Optional[int]:
    """Konwertuje wartość bool/str/None na 0, 1 albo None (dla SQLite)."""
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return int(bool(value))
    text = str(value).strip().lower()
    if text in ("true", "1"):
        return 1
    if text in ("false", "0"):
        return 0
    return None  # pusty string, "none", "null" itp.


def init_db() -> None:
    with closing(get_connection()) as conn:
        conn.executescript(SCHEMA)
        _migrate_add_city_column(conn)
        conn.commit()
    migrate_legacy_csv_if_needed()


def _migrate_add_city_column(conn: sqlite3.Connection) -> None:
    """
    Migracja dla baz utworzonych przed dodaniem kolumny `city` - `CREATE
    TABLE IF NOT EXISTS` w SCHEMA nie dotknie już istniejącej tabeli, więc
    kolumnę trzeba dodać ręcznie przez ALTER TABLE. Wszystkie oferty w tym
    projekcie dotyczą Warszawy, więc wartość jest na razie stała.
    """
    existing_columns = {row[1] for row in conn.execute("PRAGMA table_info(offers)").fetchall()}
    if "city" not in existing_columns:
        conn.execute("ALTER TABLE offers ADD COLUMN city TEXT NOT NULL DEFAULT 'WARSZAWA'")
    else:
        conn.execute("UPDATE offers SET city = 'WARSZAWA' WHERE city IS NULL OR city = ''")


def migrate_legacy_csv_if_needed() -> None:
    """
    Jednorazowa migracja starego data.csv do bazy SQLite - wykonywana tylko
    wtedy, gdy tabela `offers` jest jeszcze pusta, a plik data.csv istnieje.
    """
    csv_path = Path(LEGACY_CSV_FILE)
    if not csv_path.exists():
        return

    with closing(get_connection()) as conn:
        row_count = conn.execute("SELECT COUNT(*) FROM offers").fetchone()[0]
        if row_count > 0:
            return  # baza już ma dane - nic do migrowania

        logger.info("Wykryto istniejący %s - migruję dane do bazy %s...", LEGACY_CSV_FILE, DB_FILE)

        with csv_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            batch: list[tuple] = []
            total = 0
            for row in reader:
                batch.append((
                    row.get("id"),
                    row.get("title", ""),
                    "WARSZAWA",
                    row.get("district", ""),
                    _to_number(row.get("price")),
                    _parse_bool(row.get("negotiable")),
                    row.get("link", ""),
                    row.get("description", ""),
                    row.get("address") or None,
                    _to_number(row.get("additional_cost")),
                    _parse_bool(row.get("has_additional_cost")),
                    _to_number(row.get("deposit")),
                    _parse_bool(row.get("has_deposit_cost")),
                    _parse_bool(row.get("has_deposit")),
                    _to_number(row.get("total_monthly_cost")),
                    row.get("photos") or "[]",
                ))
                total += 1
                if len(batch) >= 2000:
                    conn.executemany(
                        f"INSERT OR IGNORE INTO offers ({', '.join(OFFER_COLUMNS)}) "
                        f"VALUES ({', '.join(['?'] * len(OFFER_COLUMNS))})",
                        batch,
                    )
                    batch.clear()

            if batch:
                conn.executemany(
                    f"INSERT OR IGNORE INTO offers ({', '.join(OFFER_COLUMNS)}) "
                    f"VALUES ({', '.join(['?'] * len(OFFER_COLUMNS))})",
                    batch,
                )

        conn.commit()
        logger.info("Zmigrowano %d rekordów z %s do %s.", total, LEGACY_CSV_FILE, DB_FILE)


def get_existing_ids() -> set[str]:
    with closing(get_connection()) as conn:
        rows = conn.execute("SELECT id FROM offers").fetchall()
    return {row[0] for row in rows}


def _record_history(conn: sqlite3.Connection, offer_id: str, district: Any, price: Any, total_monthly_cost: Any, event: str) -> None:
    conn.execute(
        "INSERT INTO offer_history (offer_id, district, price, total_monthly_cost, event) "
        "VALUES (?, ?, ?, ?, ?)",
        (offer_id, district, _to_number(price), _to_number(total_monthly_cost), event),
    )


def delete_offers(ids: set[str]) -> int:
    """Usuwa z bazy rekordy o podanych ID (zniknęły z OLX). Zwraca liczbę usuniętych wierszy.

    Przed usunięciem zapisuje snapshot oferty (event='removed') do
    `offer_history` - to jedyny moment, w którym dane o znikającej ofercie
    są jeszcze dostępne, więc historia musi być spisana tutaj, a nie później.
    """
    if not ids:
        return 0
    with closing(get_connection()) as conn:
        placeholders = ", ".join(["?"] * len(ids))
        rows_to_remove = conn.execute(
            f"SELECT id, district, price, total_monthly_cost FROM offers WHERE id IN ({placeholders})",
            tuple(ids),
        ).fetchall()
        for offer_id, district, price, total_monthly_cost in rows_to_remove:
            _record_history(conn, offer_id, district, price, total_monthly_cost, event="removed")

        cursor = conn.execute(f"DELETE FROM offers WHERE id IN ({placeholders})", tuple(ids))
        conn.commit()
        return cursor.rowcount


def insert_offer(row: dict[str, Any]) -> None:
    """Wstawia jeden nowy, kompletny rekord ogłoszenia do bazy i zapisuje
    zdarzenie 'created' w historii."""
    values = (
        row["id"],
        row["title"],
        "WARSZAWA",
        row["district"],
        _to_number(row.get("price")),
        _parse_bool(row.get("negotiable")),
        row.get("link", ""),
        row.get("description", ""),
        row.get("address"),
        _to_number(row.get("additional_cost")),
        _parse_bool(row.get("has_additional_cost")),
        _to_number(row.get("deposit")),
        _parse_bool(row.get("has_deposit_cost")),
        _parse_bool(row.get("has_deposit")),
        _to_number(row.get("total_monthly_cost")),
        row.get("photos", "[]"),
    )
    with closing(get_connection()) as conn:
        conn.execute(
            f"INSERT OR REPLACE INTO offers ({', '.join(OFFER_COLUMNS)}, updated_at) "
            f"VALUES ({', '.join(['?'] * len(OFFER_COLUMNS))}, datetime('now'))",
            values,
        )
        _record_history(conn, row["id"], row["district"], row.get("price"), row.get("total_monthly_cost"), event="created")
        conn.commit()


def start_sync_run(started_at: str) -> int:
    with closing(get_connection()) as conn:
        cursor = conn.execute(
            "INSERT INTO sync_runs (started_at) VALUES (?)", (started_at,)
        )
        conn.commit()
        return cursor.lastrowid


def finish_sync_run(run_id: int, offers_seen: int, offers_added: int, offers_removed: int, max_page: int) -> None:
    with closing(get_connection()) as conn:
        conn.execute(
            "UPDATE sync_runs SET finished_at = datetime('now'), offers_seen = ?, "
            "offers_added = ?, offers_removed = ?, max_page = ? WHERE id = ?",
            (offers_seen, offers_added, offers_removed, max_page, run_id),
        )
        conn.commit()


def count_offers() -> int:
    with closing(get_connection()) as conn:
        return conn.execute("SELECT COUNT(*) FROM offers").fetchone()[0]


def get_last_run() -> Optional[dict[str, Any]]:
    """Zwraca ostatni wpis z `sync_runs` (dla endpointu /api/sync/status)."""
    with closing(get_connection()) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute("SELECT * FROM sync_runs ORDER BY id DESC LIMIT 1").fetchone()
        return dict(row) if row else None


# ==========================================================================
# BUDOWANIE PEŁNEGO WIERSZA DLA NOWEGO OGŁOSZENIA
# ==========================================================================

def build_full_row(offer: RoomOffer) -> dict[str, Any]:
    """Pobiera opis, analizę AI i zdjęcia dla nowego ogłoszenia i zwraca
    kompletny rekord gotowy do zapisania w bazie."""

    description = ""
    try:
        description = fetch_offer_description(offer.link)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Nie udało się pobrać opisu dla id=%s: %s", offer.id, exc)

    try:
        result = analyze_listing(offer.title, str(offer.price), description)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Nie udało się przeanalizować id=%s: %s", offer.id, exc)
        result = {field: None for field in REQUIRED_MODEL_FIELDS}

    total_cost = calculate_total_cost(offer.price, result.get("additional_cost"))

    try:
        offer_photos = fetch_offer_photos(offer.link)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Nie udało się pobrać zdjęć dla id=%s: %s", offer.id, exc)
        offer_photos = []

    row: dict[str, Any] = {
        "id": offer.id,
        "title": offer.title,
        "district": offer.district,
        "price": offer.price,
        "negotiable": offer.negotiable,
        "link": offer.link,
        "description": description,
    }
    row.update(result)
    row["total_monthly_cost"] = total_cost
    row["photos"] = json.dumps(offer_photos, ensure_ascii=False)
    return row


# ==========================================================================
# SYNCHRONIZACJA
# ==========================================================================

def sync_once() -> None:
    logger.info("Start synchronizacji z OLX -> baza %s", DB_FILE)
    init_db()

    run_started_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    run_id = start_sync_run(run_started_at)

    try:
        current_offers, max_page = fetch_all_offers()
    except Exception as exc:  # noqa: BLE001
        logger.error("Nie udało się pobrać listy ogłoszeń z OLX: %s", exc)
        finish_sync_run(run_id, offers_seen=0, offers_added=0, offers_removed=0, max_page=0)
        return

    current_by_id = {offer.id: offer for offer in current_offers}
    current_ids = set(current_by_id.keys())
    logger.info("Pobrano %d ogłoszeń z %d stron OLX.", len(current_offers), max_page)

    existing_ids = get_existing_ids()

    ids_to_remove = existing_ids - current_ids
    ids_to_add = current_ids - existing_ids

    logger.info(
        "Do usunięcia: %d ogłoszeń, do dodania: %d ogłoszeń.",
        len(ids_to_remove), len(ids_to_add),
    )

    removed_count = delete_offers(ids_to_remove)

    new_ids_list = sorted(ids_to_add)
    added_count = 0
    for index, offer_id in enumerate(new_ids_list):
        offer = current_by_id[offer_id]
        logger.info("Pobieranie nowego ogłoszenia %d/%d (id=%s)", index + 1, len(new_ids_list), offer_id)

        if index > 0:
            time.sleep(NEW_OFFER_REQUEST_DELAY_SECONDS)

        try:
            row = build_full_row(offer)
        except Exception as exc:  # noqa: BLE001
            logger.error("Pominięto ogłoszenie id=%s z powodu błędu: %s", offer_id, exc)
            continue

        # Pojedynczy INSERT od razu po pobraniu - żaden nowy rekord nie ginie
        # w razie przerwania synchronizacji w połowie, a tabela nie jest
        # nigdy przepisywana w całości.
        insert_offer(row)
        added_count += 1

    logger.info(
        "Zakończono synchronizację. Usunięto: %d, dodano: %d, łącznie w bazie: %d.",
        removed_count, added_count, count_offers(),
    )
    finish_sync_run(
        run_id,
        offers_seen=len(current_offers),
        offers_added=added_count,
        offers_removed=removed_count,
        max_page=max_page,
    )


# ==========================================================================
# HARMONOGRAM I ORKIESTRACJA W TLE (uruchamiane przez proces API)
# ==========================================================================

_sync_lock = threading.Lock()
_scheduler_lock = threading.Lock()
_scheduler_started = False


def is_sync_running() -> bool:
    return _sync_lock.locked()


def _run_sync_guarded() -> None:
    """Uruchamia sync_once() pod ochroną blokady, żeby zaplanowana
    synchronizacja i ręczne wyzwolenie z API nigdy nie nachodziły na siebie."""
    if not _sync_lock.acquire(blocking=False):
        logger.info("Synchronizacja już trwa - pomijam to wywołanie.")
        return
    try:
        sync_once()
    except Exception:  # noqa: BLE001
        logger.exception("Niespodziewany błąd podczas synchronizacji.")
    finally:
        _sync_lock.release()


def trigger_manual_sync() -> bool:
    """Uruchamia synchronizację natychmiast, w osobnym wątku (nieblokująco).

    Zwraca False, jeśli inna synchronizacja już trwa (nic nowego nie
    uruchomiono), True jeśli nowa synchronizacja została wystartowana.
    """
    if _sync_lock.locked():
        return False
    thread = threading.Thread(target=_run_sync_guarded, daemon=True, name="olx-sync-manual")
    thread.start()
    return True


def seconds_until_next_run(now: datetime | None = None) -> float:
    now = now or datetime.now()
    target = now.replace(hour=RUN_HOUR, minute=RUN_MINUTE, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


def _run_forever_loop() -> None:
    logger.info("Uruchomiono harmonogram synchronizacji (godzina uruchamiania: %02d:%02d).", RUN_HOUR, RUN_MINUTE)
    while True:
        wait_seconds = seconds_until_next_run()
        next_run_at = datetime.now() + timedelta(seconds=wait_seconds)
        logger.info("Następna synchronizacja o %s (za %.1f h).", next_run_at.strftime("%Y-%m-%d %H:%M"), wait_seconds / 3600)
        time.sleep(wait_seconds)

        _run_sync_guarded()

        # Krótka przerwa, żeby uniknąć ponownego odpalenia w tej samej minucie.
        time.sleep(60)


def start_background_scheduler() -> None:
    """Startuje wątek demona z harmonogramem (raz na proces API). Bezpieczne
    do wywołania wielokrotnego - kolejne wywołania są no-opem."""
    global _scheduler_started
    with _scheduler_lock:
        if _scheduler_started:
            return
        _scheduler_started = True

    thread = threading.Thread(target=_run_forever_loop, daemon=True, name="olx-sync-scheduler")
    thread.start()
