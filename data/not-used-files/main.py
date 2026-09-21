from __future__ import annotations

import csv
from dataclasses import dataclass
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import urljoin
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup, Tag

BASE_URL = "https://www.olx.pl"
LISTING_URL = f"{BASE_URL}/nieruchomosci/stancje-pokoje/warszawa/"
OUTPUT_FILE = Path("room_offers2.csv")
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/128.0.0.0 Safari/537.36"
    )
}
DESCRIPTION_REQUEST_DELAY_SECONDS = 1.5
DESCRIPTION_MAX_RETRIES = 3
OVERLOAD_MARKERS = (
    "nasze serwery są trochę przeciążone",
    "spróbuj ponownie za chwilę",
)


@dataclass
class RoomOffer:
    id: str
    title: str
    district: str
    price: int
    negotiable: bool
    link: str
    description: str = ""


def fetch_html(url: str) -> str:
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


def save_offers_to_csv(offers: list[RoomOffer]) -> None:
    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=[
                "id",
                "title",
                "district",
                "price",
                "negotiable",
                "link",
                "description",
            ],
        )
        writer.writeheader()
        for offer in offers:
            writer.writerow(
                {
                    "id": offer.id,
                    "title": offer.title,
                    "district": offer.district,
                    "price": offer.price,
                    "negotiable": str(offer.negotiable).lower(),
                    "link": offer.link,
                    "description": offer.description,
                }
            )


def main() -> None:
    offers, max_page = fetch_all_offers()
    for index, offer in enumerate(offers):
        if index > 0:
            time.sleep(DESCRIPTION_REQUEST_DELAY_SECONDS)
        description = fetch_offer_description(offer.link)
        print(f"Pobrano pokój o id: {offer.id}")
        if not description:
            continue
        offer.description = description
    save_offers_to_csv(offers)
    print(
        f"Pobrano {len(offers)} ogloszen ze wszystkich stron i zapisano do "
        f"{OUTPUT_FILE}. Wykryto {max_page} stron wynikow."
    )


if __name__ == "__main__":
    main()
