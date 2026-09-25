"""
Router panelu administratora - chroniony logowaniem (`require_admin`).
Pozwala przeglądać, dodawać, edytować i usuwać obsługiwane miasta (wraz z
linkiem do listingu OLX), zmieniać godzinę codziennej synchronizacji per
miasto oraz ręcznie wyzwolić synchronizację dla wybranego miasta.
"""

from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.dependencies import offer_filters_params, require_admin
from backend.repositories.offer_repository import OfferFilters, OfferRepository
from backend.schemas.admin import (
    CityConfigCreateIn,
    CityConfigOut,
    CityConfigUpdateIn,
    CityDeleteOut,
    CitySyncCancelOut,
    CitySyncTriggerOut,
    OfferAdminListOut,
    OfferDeleteOut,
    OfferUpdateIn,
)
from backend.schemas.offer import OfferDetailOut, Pagination
from backend.schemas.sync import SyncRunOut
from backend.services import sync_service

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

OfferSortField = Literal["price", "total_monthly_cost", "additional_cost", "deposit", "created_at", "views_count"]


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
        cancelling=sync_service.is_sync_cancelling(city),
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


@router.post("/cities/{city}/sync/cancel", response_model=CitySyncCancelOut)
def cancel_city_sync(city: str) -> CitySyncCancelOut:
    city = city.upper()
    if sync_service.get_city_config(city) is None:
        raise HTTPException(status_code=404, detail=f"Nieznane miasto: {city}")

    cancelled = sync_service.request_cancel_sync(city)
    if not cancelled:
        raise HTTPException(status_code=409, detail=f"Synchronizacja miasta {city} nie jest aktualnie uruchomiona.")
    return CitySyncCancelOut(status="cancelling", city=city)


# --- Zarządzanie pokojami (CRUD na ofertach) --------------------------------


@router.get("/offers", response_model=OfferAdminListOut)
def list_offers_admin(
    filters: OfferFilters = Depends(offer_filters_params),
    status_: Optional[Literal["pending", "approved", "rejected"]] = Query(None, alias="status"),
    sort: OfferSortField = Query("created_at"),
    order: Literal["asc", "desc"] = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
) -> OfferAdminListOut:
    filters.status = status_
    repo = OfferRepository(db)
    rows, total = repo.search(filters, sort=sort, order=order, page=page, limit=limit)
    total_pages = (total + limit - 1) // limit if total else 0
    return OfferAdminListOut(
        data=rows,
        pagination=Pagination(page=page, limit=limit, total=total, total_pages=total_pages),
    )


@router.get("/offers/districts", response_model=list[str])
def list_offer_districts_admin(
    city: Optional[str] = Query(None, description="Filtr po mieście (kod, np. WARSZAWA)"),
    db: Session = Depends(get_db),
) -> list[str]:
    repo = OfferRepository(db)
    return repo.distinct_districts(city.strip().upper() if city else None)


@router.get("/offers/{offer_id}", response_model=OfferDetailOut)
def get_offer_admin(offer_id: str, db: Session = Depends(get_db)) -> OfferDetailOut:
    repo = OfferRepository(db)
    row = repo.get_by_id(offer_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")
    return row


@router.patch("/offers/{offer_id}", response_model=OfferDetailOut)
def update_offer_admin(offer_id: str, payload: OfferUpdateIn, db: Session = Depends(get_db)) -> OfferDetailOut:
    repo = OfferRepository(db)
    if repo.get_by_id(offer_id) is None:
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")

    values = payload.model_dump(exclude_unset=True)
    updated = repo.update(offer_id, values)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")
    return updated


@router.delete("/offers/{offer_id}", response_model=OfferDeleteOut)
def delete_offer_admin(offer_id: str, db: Session = Depends(get_db)) -> OfferDeleteOut:
    repo = OfferRepository(db)
    deleted = repo.delete(offer_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")
    return OfferDeleteOut(status="deleted", id=offer_id)
