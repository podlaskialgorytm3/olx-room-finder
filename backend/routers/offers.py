from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.config import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from backend.db.session import get_db
from backend.dependencies import offer_filters_params
from backend.repositories.offer_repository import OfferFilters, OfferRepository
from backend.schemas.offer import OfferDetailOut, OfferListOut, Pagination

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
    repo = OfferRepository(db)
    rows, total = repo.search(filters, sort=sort, order=order, page=page, limit=limit)
    total_pages = (total + limit - 1) // limit if total else 0

    return OfferListOut(
        data=rows,
        pagination=Pagination(page=page, limit=limit, total=total, total_pages=total_pages),
    )


@router.get("/{offer_id}", response_model=OfferDetailOut)
def get_offer(offer_id: str, db: Session = Depends(get_db)) -> OfferDetailOut:
    repo = OfferRepository(db)
    row = repo.get_by_id(offer_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")
    # Wejście na stronę szczegółów pokoju liczy się jako jedno wyświetlenie -
    # widoczne później w panelu administratora (zarządzanie pokojami).
    repo.increment_views(offer_id)
    row["views_count"] = row.get("views_count", 0) + 1
    return row
