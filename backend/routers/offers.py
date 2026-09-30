from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from backend.db.session import get_db
from backend.dependencies import offer_filters_params
from backend.repositories.favorite_repository import FavoriteRepository
from backend.repositories.offer_repository import OfferFilters, OfferRepository
from backend.schemas.offer import OfferDetailOut, OfferListOut, Pagination
from backend.schemas.route import RouteRequestIn, RouteResultOut
from backend.services import suspicious_offers_service
from backend.services.routing_service import RoutingError, get_route_for_offer

router = APIRouter(prefix="/api/offers", tags=["offers"])

SortField = Literal["price", "total_monthly_cost", "additional_cost", "deposit", "created_at", "views_count"]


@router.get("", response_model=OfferListOut)
def list_offers(
    filters: OfferFilters = Depends(offer_filters_params),
    sort: SortField = Query("created_at"),
    order: Literal["asc", "desc"] = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    db: Session = Depends(get_db),
) -> OfferListOut:
    # Publiczna lista pokazuje wyłącznie zatwierdzone ogłoszenia - oferty
    # wynajmujących oczekujące na moderację (lub odrzucone) nigdy nie
    # przechodzą przez ten endpoint, niezależnie od przekazanych filtrów.
    filters.status = "approved"
    repo = OfferRepository(db)
    rows, total = repo.search(filters, sort=sort, order=order, page=page, limit=limit)
    total_pages = (total + limit - 1) // limit if total else 0

    # Ostrzeżenia liczone jednym przejściem po całym zbiorze zatwierdzonych
    # ofert (patrz suspicious_offers_service) - unika N osobnych zapytań na
    # stronę wyników.
    warnings_by_offer = suspicious_offers_service.compute_warnings_for_all_offers(db)
    for row in rows:
        row["warnings"] = warnings_by_offer.get(row["id"], [])

    return OfferListOut(
        data=rows,
        pagination=Pagination(page=page, limit=limit, total=total, total_pages=total_pages),
    )


@router.get("/{offer_id}", response_model=OfferDetailOut)
def get_offer(offer_id: str, db: Session = Depends(get_db)) -> OfferDetailOut:
    repo = OfferRepository(db)
    row = repo.get_by_id(offer_id)
    if row is None or row.get("status") != "approved":
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")
    # Wejście na stronę szczegółów pokoju liczy się jako jedno wyświetlenie -
    # widoczne później w panelu administratora (zarządzanie pokojami).
    repo.increment_views(offer_id)
    row["views_count"] = row.get("views_count", 0) + 1
    row["favorites_count"] = FavoriteRepository(db).count_for_offer(offer_id)
    row["warnings"] = suspicious_offers_service.get_warnings_for_offer(db, offer_id)
    return row


@router.post("/{offer_id}/route", response_model=RouteResultOut)
def get_offer_route(offer_id: str, payload: RouteRequestIn, db: Session = Depends(get_db)) -> RouteResultOut:
    """Liczy on-demand (nigdy podczas synchronizacji OLX) czas dojazdu
    komunikacją publiczną i odległość z lokalizacji oferty do miejsca
    podanego przez użytkownika - patrz `backend/services/routing_service.py`."""
    repo = OfferRepository(db)
    row = repo.get_by_id(offer_id)
    if row is None or row.get("status") != "approved":
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")

    try:
        result = get_route_for_offer(offer_id, payload.destination, db)
    except RoutingError as exc:
        # Nigdy nie pokazujemy użytkownikowi szczegółów technicznych API
        # geokodowania/routingu - tylko czytelny komunikat PL.
        raise HTTPException(status_code=422, detail=exc.message) from exc

    return RouteResultOut(
        duration_min=result.duration_min,
        distance_km=result.distance_km,
        destination_label=result.destination_label,
    )
