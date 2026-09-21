"""
fetch_photos.py
================

Dla każdego ogłoszenia z pliku room_offers2_analyzed.csv wchodzi pod jego
`link`, wyciąga wszystkie zdjęcia z galerii (swiper-slide, data-testid="ad-photo")
i zapisuje je jako jednowymiarową tablicę w nowej kolumnie `photos`, np.:

["https://ireland.apollo.olxcdn.com:443/v1/files/klb3ldw8v8am3-PL/image;s=1000x700", ...]

Program jest odporny na błędy pojedynczych rekordów oraz wznawialny —
zapisuje postęp na bieżąco (po każdym rekordzie), więc przerwanie (Ctrl+C,
błąd sieci, itp.) nie wymaga zaczynania od zera.
"""

from __future__ import annotations

import csv
import json
import logging
import os
import re
import subprocess
import sys
import time
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import requests
from bs4 import BeautifulSoup

INPUT_FILE = "room_offers2_analyzed.csv"
OUTPUT_FILE = "room_offers2_analyzed.csv"
LOG_FILE = "fetch_photos.log"

NEW_COLUMN = "photos"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/128.0.0.0 Safari/537.36"
    )
}

REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = 5
OVERLOAD_MARKERS = (
    "nasze serwery są trochę przeciążone",
    "spróbuj ponownie za chwilę",
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


def fetch_html(url: str) -> str:
    """Pobiera HTML strony ogłoszenia (fallback na curl, jak w main.py)."""
    response = requests.get(url, headers=HEADERS, timeout=30)
    if response.ok:
        return response.text

    curl_result = subprocess.run(
        [
            "curl",
            "-L",
            "-A",
            HEADERS["User-Agent"],
            "--compressed",
            url,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return curl_result.stdout


def is_overload_response(html: str) -> bool:
    lowered = html.lower()
    return any(marker in lowered for marker in OVERLOAD_MARKERS)


def strip_size_suffix(src: str) -> str:
    """
    Usuwa parametr rozmiaru (np. ";s=1000x700") z linku do zdjęcia, żeby dostać
    pełnowymiarowy oryginał, np.:
    https://.../v1/files/klb3ldw8v8am3-PL/image;s=1000x700 ->
    https://.../v1/files/klb3ldw8v8am3-PL/image
    """
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

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            html = fetch_html(link)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Błąd pobierania %s: %s", link, exc)
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
                continue
            return []

        if is_overload_response(html):
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_BACKOFF_SECONDS * attempt)
                continue
            return []

        return extract_photos_from_html(html)

    return []


def load_csv(path: str) -> tuple[list[dict[str, Any]], list[str]]:
    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames or []
        rows = list(reader)
    return rows, fieldnames


def save_results(rows: list[dict[str, Any]], fieldnames: list[str], path: str) -> None:
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    os.replace(tmp_path, path)


def photos_already_done(row: dict[str, Any]) -> bool:
    """Uznajemy rekord za już przetworzony, jeśli kolumna photos ma jakąkolwiek
    (niepustą) wartość - w tym poprawny JSON pustej listy '[]'."""
    value = row.get(NEW_COLUMN)
    return value is not None and value != ""


def process_photos(input_file: str, output_file: str) -> None:
    rows, original_fieldnames = load_csv(input_file)
    fieldnames = list(original_fieldnames)
    if NEW_COLUMN not in fieldnames:
        fieldnames.append(NEW_COLUMN)

    total = len(rows)
    processed_count = 0

    for index, row in enumerate(rows):
        display_index = index + 1
        record_id = row.get("id")

        if photos_already_done(row):
            processed_count += 1
            continue

        print(f"Processing {display_index}/{total} (id={record_id})")

        link = row.get("link", "") or ""

        try:
            photos = fetch_offer_photos(link)
        except Exception as exc:  # noqa: BLE001
            logger.error("Niespodziewany błąd przy rekordzie id=%s: %s", record_id, exc)
            photos = []

        row[NEW_COLUMN] = json.dumps(photos, ensure_ascii=False)
        processed_count += 1

        # Zapis po KAŻDYM rekordzie, aby żaden postęp nie został utracony.
        save_results(rows, fieldnames, output_file)
        logger.info(
            "Zapisano rekord %d/%d (id=%s, %d zdjęć).",
            display_index, total, record_id, len(photos),
        )

        if index < total - 1:
            time.sleep(REQUEST_DELAY_SECONDS)

    logger.info(
        "Zakończono przetwarzanie %d/%d rekordów. Wynik zapisano w %s",
        processed_count, total, output_file,
    )


def main() -> None:
    logger.info("Start pobierania zdjęć: %s -> %s", INPUT_FILE, OUTPUT_FILE)
    try:
        process_photos(INPUT_FILE, OUTPUT_FILE)
    except KeyboardInterrupt:
        logger.warning("Przerwano przez użytkownika (Ctrl+C). Postęp został zapisany, można wznowić uruchamiając skrypt ponownie.")
        sys.exit(1)
    except FileNotFoundError as exc:
        logger.error("Nie znaleziono pliku: %s", exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
