"""
room_analysis.py
=================

Analizuje ogłoszenia wynajmu pokoi (plik CSV wygenerowany przez scraper OLX)
przy pomocy lokalnego modelu AI uruchomionego w Ollama.

Dla każdego ogłoszenia model wydobywa z pola `description`:
    - adres (address)
    - dodatkowe koszty miesięczne (additional_cost, has_additional_cost)
    - kaucję (deposit, has_deposit_cost, has_deposit)

Program dolicza także `total_monthly_cost` na podstawie `price` i `additional_cost`.

Program jest odporny na błędy pojedynczych rekordów oraz wznawialny —
zapisuje postęp na bieżąco, więc przerwanie (np. Ctrl+C, brak prądu,
padnięcie Ollamy) nie wymaga zaczynania od zera.
"""

import csv
import json
import logging
import os
import sys
import time
from typing import Any, Optional

import requests

# --------------------------------------------------------------------------
# KONFIGURACJA
# --------------------------------------------------------------------------

INPUT_FILE = "room_offers2.csv"
OUTPUT_FILE = "room_offers2_analyzed.csv"
LOG_FILE = "room_analysis.log"

# Nazwa modelu Ollama - zmień na dowolny model dostępny lokalnie,
# np. "llama3.1", "mistral", "qwen2.5:7b" itp.
MODEL_NAME = "llama3.2:3b"

# Adres lokalnego API Ollama (domyślny, jeśli Ollama działa na tym samym hoście).
OLLAMA_URL = "http://localhost:11434/api/generate"

# Ile razy ponawiamy zapytanie do modelu, jeśli odpowiedź nie jest poprawnym JSON-em.
MAX_RETRIES = 2

# Limit czasu (w sekundach) oczekiwania na odpowiedź od Ollamy.
# Na słabszych maszynach / bez GPU / przy dużym obciążeniu CPU inferencja
# modelu 3B potrafi trwać kilka minut, dlatego dajemy spory zapas.
REQUEST_TIMEOUT = 300

# Bazowe opóźnienie (w sekundach) przed ponowną próbą po niepoprawnej
# odpowiedzi / timeoucie. Rośnie z każdą próbą (backoff), żeby dać
# przeciążonemu serwerowi Ollama czas na "oddech".
RETRY_BACKOFF_SECONDS = 10

# Nowe kolumny dodawane przez analizę.
NEW_COLUMNS = [
    "address",
    "additional_cost",
    "has_additional_cost",
    "deposit",
    "has_deposit_cost",
    "has_deposit",
    "total_monthly_cost",
]

# Pola oczekiwane bezpośrednio w odpowiedzi JSON modelu (bez total_monthly_cost,
# które liczymy sami).
REQUIRED_MODEL_FIELDS = [
    "address",
    "additional_cost",
    "has_additional_cost",
    "deposit",
    "has_deposit_cost",
    "has_deposit",
]

# --------------------------------------------------------------------------
# LOGOWANIE
# --------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------
# WCZYTYWANIE / ZAPIS DANYCH
# --------------------------------------------------------------------------

def load_csv(path: str) -> tuple[list[dict[str, Any]], list[str]]:
    """Wczytuje plik CSV do listy słowników i zwraca też oryginalne nazwy kolumn."""
    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows = list(reader)
    return rows, fieldnames


def load_existing_output(path: str) -> list[dict[str, Any]]:
    """
    Wczytuje już częściowo przetworzony plik wynikowy (jeśli istnieje), aby
    umożliwić wznowienie pracy. Zwraca listę rekordów w oryginalnej kolejności.
    """
    if not os.path.exists(path):
        return []

    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader)


def save_results(rows: list[dict[str, Any]], fieldnames: list[str], path: str) -> None:
    """Zapisuje pełną listę rekordów do pliku CSV (nadpisując poprzednią wersję)."""
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    # Podmiana atomowa, żeby nie uszkodzić pliku w razie przerwania w trakcie zapisu.
    os.replace(tmp_path, path)


# --------------------------------------------------------------------------
# PROMPT DLA MODELU
# --------------------------------------------------------------------------

def create_prompt(title: str, price: str, description: str) -> str:
    """Buduje prompt wysyłany do modelu AI dla pojedynczego ogłoszenia."""
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


# --------------------------------------------------------------------------
# KOMUNIKACJA Z OLLAMA
# --------------------------------------------------------------------------

def _extract_json(raw_text: str) -> Optional[dict[str, Any]]:
    """
    Próbuje wyciągnąć obiekt JSON z odpowiedzi modelu, na wypadek gdyby
    model dodał dodatkowy tekst mimo instrukcji.
    """
    raw_text = raw_text.strip()
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        pass

    # Fallback: znajdź pierwszy '{' i ostatni '}' i spróbuj sparsować wycinek.
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
    """
    Wysyła pojedynczy prompt do lokalnego API Ollama i zwraca sparsowany JSON
    lub None, jeśli odpowiedź jest niepoprawna albo wystąpił błąd połączenia.
    """
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0,
            # Niektóre ogłoszenia mają bardzo długie (dwujęzyczne) opisy, przez co
            # domyślne okno kontekstu (4096) było za małe i Ollama ucinała prompt
            # (tracąc część instrukcji), co powodowało "uciekające" generowanie
            # i timeouty. Większy num_ctx mieści cały prompt bez ucinania.
            "num_ctx": 8192,
            # Oczekiwana odpowiedź to krótki JSON — ograniczamy max. długość
            # generowania, żeby nawet w razie problemów z modelem żądanie
            # kończyło się szybko, zamiast generować w nieskończoność.
            "num_predict": 300,
        },
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=REQUEST_TIMEOUT)
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
    """Sprawdza, czy odpowiedź modelu zawiera wszystkie wymagane pola."""
    if not isinstance(result, dict):
        return False
    return all(field in result for field in REQUIRED_MODEL_FIELDS)


def analyze_listing(title: str, price: str, description: str) -> dict[str, Any]:
    """
    Analizuje pojedyncze ogłoszenie przy pomocy modelu AI.
    Ponawia próbę do MAX_RETRIES razy, jeśli odpowiedź jest niepoprawna.
    W razie ostatecznej porażki zwraca słownik wypełniony wartościami None.
    """
    prompt = create_prompt(title, price, description)

    attempt = 0
    while attempt <= MAX_RETRIES:
        result = query_ollama(prompt)
        if validate_result(result):
            return {field: result[field] for field in REQUIRED_MODEL_FIELDS}

        attempt += 1
        if attempt <= MAX_RETRIES:
            delay = RETRY_BACKOFF_SECONDS * attempt
            logger.warning(
                "Niepoprawna odpowiedź modelu, próba %d/%d... (czekam %ds)",
                attempt, MAX_RETRIES, delay,
            )
            time.sleep(delay)

    logger.error("Nie udało się uzyskać poprawnej odpowiedzi dla ogłoszenia: '%s'", title)
    return {field: None for field in REQUIRED_MODEL_FIELDS}


# --------------------------------------------------------------------------
# OBLICZENIA POMOCNICZE
# --------------------------------------------------------------------------

def _to_number(value: Any) -> Optional[float]:
    """Bezpiecznie konwertuje wartość na liczbę, zwraca None jeśli się nie da."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        return float(str(value).replace(",", ".").strip())
    except (ValueError, TypeError):
        return None


def calculate_total_cost(price: Any, additional_cost: Any) -> Optional[float]:
    """
    Wylicza total_monthly_cost = price + additional_cost.
    Jeśli którakolwiek z wartości jest nieznana (None), wynik też jest None.
    """
    price_num = _to_number(price)
    additional_num = _to_number(additional_cost)

    if price_num is None or additional_num is None:
        return None

    total = price_num + additional_num
    # Zwracamy int, jeśli wynik jest liczbą całkowitą (czytelniejszy zapis w CSV).
    return int(total) if total == int(total) else total


# --------------------------------------------------------------------------
# GŁÓWNA PĘTLA PRZETWARZANIA
# --------------------------------------------------------------------------

def process_listings(input_file: str, output_file: str) -> None:
    """
    Główna funkcja sterująca: wczytuje dane wejściowe, wznawia z istniejącego
    pliku wynikowego (jeśli jest), przetwarza rekordy pojedynczo i zapisuje
    plik wynikowy po każdym przetworzonym rekordzie.

    Wznawianie działa na zasadzie prefiksu: ponieważ rekordy są przetwarzane
    zawsze w tej samej, ustalonej kolejności (od góry pliku wejściowego),
    wystarczy sprawdzić ile rekordów o zgodnych id znajduje się już na
    początku istniejącego pliku wynikowego i kontynuować od tego miejsca.
    """
    rows, original_fieldnames = load_csv(input_file)
    fieldnames = original_fieldnames + NEW_COLUMNS
    total = len(rows)

    processed_rows = load_existing_output(output_file)

    # Sprawdzamy, ile rekordów z istniejącego pliku wynikowego rzeczywiście
    # odpowiada początkowi bieżącego pliku wejściowego (ta sama kolejność id).
    resume_index = 0
    for resume_index, existing_row in enumerate(processed_rows):
        if resume_index >= total or existing_row.get("id") != rows[resume_index].get("id"):
            break
    else:
        resume_index = len(processed_rows)

    if resume_index > 0:
        processed_rows = processed_rows[:resume_index]
        logger.info("Wznawianie od rekordu %d/%d (znaleziono wcześniejszy postęp).", resume_index + 1, total)
    else:
        processed_rows = []

    for index in range(resume_index, total):
        row = rows[index]
        record_id = row.get("id")
        display_index = index + 1

        print(f"Processing {display_index}/{total}")

        title = row.get("title", "") or ""
        price = row.get("price", "") or ""
        description = row.get("description", "") or ""

        try:
            analysis = analyze_listing(title, price, description)
        except Exception as exc:  # noqa: BLE001 - chcemy złapać wszystko, żeby nie przerwać pętli
            logger.error("Niespodziewany błąd przy rekordzie id=%s: %s", record_id, exc)
            analysis = {field: None for field in REQUIRED_MODEL_FIELDS}

        total_cost = calculate_total_cost(price, analysis.get("additional_cost"))

        enriched_row = dict(row)
        enriched_row.update(analysis)
        enriched_row["total_monthly_cost"] = total_cost

        processed_rows.append(enriched_row)

        # Zapis po KAŻDYM rekordzie, aby żaden przetworzony wynik nigdy nie
        # został utracony, niezależnie od tego, kiedy program zostanie przerwany.
        save_results(processed_rows, fieldnames, output_file)
        logger.info("Zapisano rekord %d/%d (id=%s).", display_index, total, record_id)

    logger.info("Zakończono przetwarzanie %d/%d rekordów. Wynik zapisano w %s", total, total, output_file)


# --------------------------------------------------------------------------
# PUNKT WEJŚCIA
# --------------------------------------------------------------------------

def main() -> None:
    logger.info("Start analizy: %s -> %s (model: %s)", INPUT_FILE, OUTPUT_FILE, MODEL_NAME)
    try:
        process_listings(INPUT_FILE, OUTPUT_FILE)
    except KeyboardInterrupt:
        logger.warning("Przerwano przez użytkownika (Ctrl+C). Postęp został zapisany, można wznowić uruchamiając skrypt ponownie.")
        sys.exit(1)
    except FileNotFoundError as exc:
        logger.error("Nie znaleziono pliku: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
