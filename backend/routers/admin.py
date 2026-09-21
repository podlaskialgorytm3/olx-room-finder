"""
Router panelu administratora - chroniony logowaniem (`require_admin`).
Pozwala przeglądać i zmieniać godzinę codziennej synchronizacji per miasto
oraz ręcznie wyzwolić synchronizację dla wybranego miasta.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import require_admin
from backend.schemas.admin import CityConfigOut, CityConfigUpdateIn, CitySyncTriggerOut
from backend.schemas.sync import SyncRunOut
from backend.services import sync_service

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _city_config_out(config: dict) -> CityConfigOut:
    city = config["city"]
    last_run = sync_service.get_last_run(city)
    return CityConfigOut(
        city=city,
        display_name=config["display_name"],
        sync_hour=config["sync_hour"],
        sync_minute=config["sync_minute"],
        offers_count=sync_service.count_offers(city),
        running=sync_service.is_sync_running(city),
        last_run=SyncRunOut(**last_run) if last_run else None,
    )


@router.get("/cities", response_model=list[CityConfigOut])
def list_cities() -> list[CityConfigOut]:
    return [_city_config_out(config) for config in sync_service.get_city_configs()]


@router.patch("/cities/{city}", response_model=CityConfigOut)
def update_city(city: str, payload: CityConfigUpdateIn) -> CityConfigOut:
    city = city.upper()
    if city not in sync_service.CITIES:
        raise HTTPException(status_code=404, detail=f"Nieznane miasto: {city}")

    config = sync_service.update_city_sync_hour(city, payload.sync_hour, payload.sync_minute)
    if config is None:
        raise HTTPException(status_code=404, detail=f"Nieznane miasto: {city}")
    return _city_config_out(config)


@router.post("/cities/{city}/sync", response_model=CitySyncTriggerOut, status_code=202)
def trigger_city_sync(city: str) -> CitySyncTriggerOut:
    city = city.upper()
    if city not in sync_service.CITIES:
        raise HTTPException(status_code=404, detail=f"Nieznane miasto: {city}")

    started = sync_service.trigger_manual_sync(city)
    if not started:
        raise HTTPException(status_code=409, detail=f"Synchronizacja miasta {city} już trwa.")
    return CitySyncTriggerOut(status="started", city=city)
