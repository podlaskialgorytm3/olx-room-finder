"""
Publiczny router listy miast - w przeciwieństwie do `/api/admin/cities` nie
wymaga logowania. Używany przez frontend do zbudowania przełącznika miasta
(np. na stronie głównej), żeby użytkownik mógł wybrać, dla którego miasta
przegląda oferty.
"""

from __future__ import annotations

from fastapi import APIRouter

from backend.schemas.city import PublicCityOut
from backend.services import sync_service

router = APIRouter(prefix="/api/cities", tags=["cities"])


@router.get("", response_model=list[PublicCityOut])
def list_public_cities() -> list[PublicCityOut]:
    return [
        PublicCityOut(city=config["city"], display_name=config["display_name"])
        for config in sync_service.get_city_configs()
    ]
