"""
Router panelu administratora - chroniony logowaniem (`require_admin`).
Pozwala przeglądać, dodawać, edytować i usuwać obsługiwane miasta (wraz z
linkiem do listingu OLX), zmieniać godzinę codziennej synchronizacji per
miasto oraz ręcznie wyzwolić synchronizację dla wybranego miasta.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from backend.dependencies import require_admin
from backend.schemas.admin import (
    CityConfigCreateIn,
    CityConfigOut,
    CityConfigUpdateIn,
    CityDeleteOut,
    CitySyncTriggerOut,
)
from backend.schemas.sync import SyncRunOut
from backend.services import sync_service

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _city_config_out(config: dict) -> CityConfigOut:
    city = config["city"]
    last_run = sync_service.get_last_run(city)
    return CityConfigOut(
        city=city,
        display_name=config["display_name"],
        link=config.get("link"),
        sync_hour=config["sync_hour"],
        sync_minute=config["sync_minute"],
        offers_count=sync_service.count_offers(city),
        running=sync_service.is_sync_running(city),
        last_run=SyncRunOut(**last_run) if last_run else None,
    )


@router.get("/cities", response_model=list[CityConfigOut])
def list_cities() -> list[CityConfigOut]:
    return [_city_config_out(config) for config in sync_service.get_city_configs()]


@router.post("/cities", response_model=CityConfigOut, status_code=201)
def create_city(payload: CityConfigCreateIn) -> CityConfigOut:
    if sync_service.get_city_config(payload.city) is not None:
        raise HTTPException(status_code=409, detail=f"Miasto {payload.city} już istnieje.")

    try:
        config = sync_service.create_city_config(
            city=payload.city,
            display_name=payload.display_name,
            link=payload.link,
            sync_hour=payload.sync_hour,
            sync_minute=payload.sync_minute,
        )
    except sync_service.InvalidOlxLinkError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return _city_config_out(config)


@router.patch("/cities/{city}", response_model=CityConfigOut)
def update_city(city: str, payload: CityConfigUpdateIn) -> CityConfigOut:
    city = city.upper()
    if sync_service.get_city_config(city) is None:
        raise HTTPException(status_code=404, detail=f"Nieznane miasto: {city}")

    try:
        config = sync_service.update_city_config(
            city,
            sync_hour=payload.sync_hour,
            sync_minute=payload.sync_minute,
            display_name=payload.display_name,
            link=payload.link,
        )
    except sync_service.InvalidOlxLinkError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if config is None:
        raise HTTPException(status_code=404, detail=f"Nieznane miasto: {city}")
    return _city_config_out(config)


@router.delete("/cities/{city}", response_model=CityDeleteOut)
def delete_city(city: str) -> CityDeleteOut:
    city = city.upper()
    if sync_service.is_sync_running(city):
        raise HTTPException(status_code=409, detail=f"Synchronizacja miasta {city} właśnie trwa, spróbuj ponownie później.")

    deleted = sync_service.delete_city_config(city)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Nieznane miasto: {city}")
    return CityDeleteOut(status="deleted", city=city)


@router.post("/cities/{city}/sync", response_model=CitySyncTriggerOut, status_code=202)
def trigger_city_sync(city: str) -> CitySyncTriggerOut:
    city = city.upper()
    if sync_service.get_city_config(city) is None:
        raise HTTPException(status_code=404, detail=f"Nieznane miasto: {city}")

    started = sync_service.trigger_manual_sync(city)
    if not started:
        raise HTTPException(status_code=409, detail=f"Synchronizacja miasta {city} już trwa.")
    return CitySyncTriggerOut(status="started", city=city)
