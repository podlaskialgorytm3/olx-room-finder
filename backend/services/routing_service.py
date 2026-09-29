"""
Serwis "Sprawdź dojazd" - liczy on-demand czas i odległość dojazdu
komunikacją publiczną z lokalizacji oferty do dowolnego miejsca wpisanego
przez użytkownika (np. "Politechnika Warszawska").

WAŻNE (patrz treść feature'a): trasa NIGDY nie jest liczona podczas
synchronizacji OLX (`sync_service.py`) - wyłącznie na żądanie, gdy
użytkownik otworzy szczegóły oferty i kliknie "Sprawdź dojazd"
(`POST /api/offers/{offer_id}/route`, patrz `backend/routers/routing.py`).

Architektura (dwie niezależne, wymienne usługi zewnętrzne):
  1. Geokodowanie (tekst -> lat/lng) - Nominatim (OpenStreetMap), bez klucza
     API. Używane zarówno dla miejsca docelowego, jak i (leniwie, przy
     pierwszym zapytaniu o trasę) dla lokalizacji samej oferty, gdy oferta
     nie ma jeszcze zapisanych współrzędnych - patrz `_resolve_offer_location`.
  2. Routing (dwa punkty -> dystans/czas) - publiczny serwer OSRM (profil
     pieszy), używany do policzenia realnej odległości siecią dróg. Darmowe
     API tras transitowych (GTFS) wymagałoby danych/klucza, których tu nie
     mamy, więc czas przejazdu komunikacją publiczną jest SZACOWANY na
     podstawie tej odległości (średnia prędkość "od drzwi do drzwi" + czas
     oczekiwania - patrz `PUBLIC_TRANSPORT_*` w `backend/config.py`). Fasada
     `RoutingService` jest zaprojektowana tak, by w przyszłości podmienić to
     na prawdziwe API transitowe bez zmiany wywołań w routerze.

Wszystkie błędy sieciowe/API są łapane i zamieniane na `RoutingError` z
czytelnym komunikatem PL - router nigdy nie pokazuje użytkownikowi
technicznych szczegółów wyjątku.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Optional

import requests
from sqlalchemy.orm import Session

from backend.config import (
    GEOCODING_BASE_URL,
    GEOCODING_USER_AGENT,
    PUBLIC_TRANSPORT_AVG_SPEED_KMH,
    PUBLIC_TRANSPORT_WAIT_MIN,
    ROUTING_BASE_URL,
    ROUTING_HTTP_TIMEOUT,
)
from backend.repositories.offer_repository import OfferRepository
from backend.repositories.route_cache_repository import RouteCacheRepository


class RoutingError(Exception):
    """Bazowy wyjątek - komunikat w `message` jest bezpieczny do pokazania
    użytkownikowi (bez szczegółów technicznych API)."""

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class LocationNotFoundError(RoutingError):
    pass


class RouteNotFoundError(RoutingError):
    pass


@dataclass
class Coordinates:
    latitude: float
    longitude: float
    label: Optional[str] = None


@dataclass
class RouteResult:
    distance_km: float
    duration_min: int
    destination_label: Optional[str]
    from_cache: bool = False


def _geocode(query: str) -> Optional[Coordinates]:
    """Zamienia dowolny tekst (adres, nazwa miejsca, miasto) na współrzędne
    przez Nominatim. Zwraca None, jeśli nic nie znaleziono - błędy
    sieciowe/parsowania też traktujemy jako "nie znaleziono", nigdy nie
    wysadzamy w tym miejscu wyjątku technicznego dalej do użytkownika."""
    if not query or not query.strip():
        return None
    try:
        response = requests.get(
            GEOCODING_BASE_URL,
            params={"q": query, "format": "json", "limit": 1},
            headers={"User-Agent": GEOCODING_USER_AGENT},
            timeout=ROUTING_HTTP_TIMEOUT,
        )
        response.raise_for_status()
        results = response.json()
    except (requests.exceptions.RequestException, ValueError):
        return None

    if not results:
        return None

    first = results[0]
    try:
        return Coordinates(
            latitude=float(first["lat"]),
            longitude=float(first["lon"]),
            label=first.get("display_name"),
        )
    except (KeyError, TypeError, ValueError):
        return None


def _haversine_km(a: Coordinates, b: Coordinates) -> float:
    """Odległość w linii prostej (km) - używana jako fallback, gdyby usługa
    routingu (OSRM) była akurat niedostępna."""
    r = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, (a.latitude, a.longitude, b.latitude, b.longitude))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return r * 2 * math.asin(math.sqrt(h))


def _route_distance_km(origin: Coordinates, destination: Coordinates) -> Optional[float]:
    """Odległość siecią dróg (km) z publicznego serwera OSRM (profil
    pieszy). Zwraca None, jeśli usługa nie znalazła trasy / jest
    niedostępna - wołający sam decyduje o fallbacku."""
    url = f"{ROUTING_BASE_URL}/{origin.longitude},{origin.latitude};{destination.longitude},{destination.latitude}"
    try:
        response = requests.get(
            url,
            params={"overview": "false"},
            timeout=ROUTING_HTTP_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
    except (requests.exceptions.RequestException, ValueError):
        return None

    if data.get("code") != "Ok" or not data.get("routes"):
        return None

    try:
        return float(data["routes"][0]["distance"]) / 1000.0
    except (KeyError, TypeError, ValueError):
        return None


def _estimate_public_transport_duration_min(distance_km: float) -> int:
    """Szacuje czas dojazdu komunikacją publiczną na podstawie odległości -
    patrz komentarz na górze pliku (brak darmowego API transitowego)."""
    travel_min = (distance_km / PUBLIC_TRANSPORT_AVG_SPEED_KMH) * 60
    return max(1, round(travel_min + PUBLIC_TRANSPORT_WAIT_MIN))


def _resolve_offer_location(offer: dict[str, Any], db: Session) -> Coordinates:
    """Zwraca współrzędne oferty - z bazy, jeśli już zostały wcześniej
    dogeokodowane, albo geokoduje je teraz (i zapisuje w bazie, żeby nie
    robić tego ponownie przy kolejnym żądaniu trasy dla tej samej oferty).

    Próbuje po kolei coraz mniej dokładnych zapytań (dokładny adres ->
    dzielnica+miasto -> samo miasto), żeby zawsze zwrócić "możliwie najlepszą
    dostępną lokalizację", zgodnie z wymaganiem feature'a, zamiast od razu
    zwracać błąd, gdy OLX nie podał dokładnego adresu."""
    if offer.get("latitude") is not None and offer.get("longitude") is not None:
        return Coordinates(latitude=offer["latitude"], longitude=offer["longitude"])

    city = offer.get("city") or ""
    candidates = [
        offer.get("address"),
        ", ".join(part for part in [offer.get("district"), city, "Polska"] if part),
        ", ".join(part for part in [city, "Polska"] if part),
    ]

    for candidate in candidates:
        if not candidate:
            continue
        coords = _geocode(candidate)
        if coords is not None:
            OfferRepository(db).set_coordinates(offer["id"], coords.latitude, coords.longitude)
            return coords

    raise LocationNotFoundError("Nie udało się obliczyć trasy dla podanych lokalizacji.")


def get_route_for_offer(offer_id: str, destination: str, db: Session) -> RouteResult:
    """Główny wejściowy punkt serwisu, używany przez
    `POST /api/offers/{offer_id}/route`."""
    destination = (destination or "").strip()
    if not destination:
        raise RoutingError("Podaj miejsce docelowe.")

    offer_repo = OfferRepository(db)
    offer = offer_repo.get_by_id(offer_id)
    if offer is None:
        raise RoutingError("Oferta nie została znaleziona.")

    cache_repo = RouteCacheRepository(db)
    cached = cache_repo.get(offer_id, destination)
    if cached is not None:
        return RouteResult(
            distance_km=cached["distance_km"],
            duration_min=cached["duration_min"],
            destination_label=cached["destination_label"],
            from_cache=True,
        )

    origin = _resolve_offer_location(offer, db)

    destination_coords = _geocode(destination)
    if destination_coords is None:
        raise LocationNotFoundError("Nie udało się obliczyć trasy dla podanych lokalizacji.")

    distance_km = _route_distance_km(origin, destination_coords)
    if distance_km is None:
        # OSRM nie znalazł trasy siecią dróg (np. inny kontynent) - liczymy
        # dystans w linii prostej jako ostatnią deskę ratunku zamiast od
        # razu zwracać błąd użytkownikowi.
        distance_km = _haversine_km(origin, destination_coords)

    if distance_km <= 0:
        raise RouteNotFoundError("Nie udało się obliczyć trasy dla podanych lokalizacji.")

    duration_min = _estimate_public_transport_duration_min(distance_km)

    cache_repo.set(
        offer_id,
        destination,
        destination_coords.label,
        round(distance_km, 2),
        duration_min,
    )

    return RouteResult(
        distance_km=round(distance_km, 2),
        duration_min=duration_min,
        destination_label=destination_coords.label,
    )
