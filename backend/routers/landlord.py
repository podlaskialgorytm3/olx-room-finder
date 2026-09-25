"""
Router panelu wynajmującego - chroniony logowaniem (`require_landlord`, patrz
`backend/dependencies.py`). Pozwala zalogowanemu, zatwierdzonemu kontu
wynajmującego zarządzać własnymi ogłoszeniami (CRUD), niezależnie od ofert
zsynchronizowanych z OLX. Nowe/edytowane ogłoszenie zawsze trafia ze statusem
`pending` i staje się widoczne w publicznym `/api/offers` dopiero po
zatwierdzeniu przez administratora (`PATCH /api/admin/offers/{id}` w panelu
"Zarządzanie pokojami").
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.dependencies import require_landlord
from backend.repositories.offer_repository import OfferFilters, OfferRepository
from backend.db.session import get_db
from backend.schemas.landlord import (
    LandlordOfferCreateIn,
    LandlordOfferDeleteOut,
    LandlordOfferListOut,
    LandlordOfferUpdateIn,
)
from backend.schemas.offer import OfferDetailOut, Pagination
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/landlord/offers", tags=["landlord"])


def _compute_total_monthly_cost(price: float, additional_cost: float | None, has_additional_cost: bool | None) -> float:
    """Domyślne wyliczenie całkowitego kosztu miesięcznego, gdy wynajmujący
    nie poda go ręcznie: cena + dodatkowe opłaty (o ile są znane i
    zadeklarowane jako istniejące)."""
    if has_additional_cost and additional_cost is not None:
        return price + additional_cost
    return price


@router.get("", response_model=LandlordOfferListOut)
def list_my_offers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    user: dict = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> LandlordOfferListOut:
    repo = OfferRepository(db)
    filters = OfferFilters(owner_user_id=user["id"])
    rows, total = repo.search(filters, sort="created_at", order="desc", page=page, limit=limit)
    total_pages = (total + limit - 1) // limit if total else 0
    return LandlordOfferListOut(
        data=rows,
        pagination=Pagination(page=page, limit=limit, total=total, total_pages=total_pages),
    )


@router.get("/{offer_id}", response_model=OfferDetailOut)
def get_my_offer(offer_id: str, user: dict = Depends(require_landlord), db: Session = Depends(get_db)) -> OfferDetailOut:
    repo = OfferRepository(db)
    row = repo.get_by_id(offer_id)
    if row is None or row.get("owner_user_id") != user["id"]:
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")
    return row


@router.post("", response_model=OfferDetailOut, status_code=status.HTTP_201_CREATED)
def create_my_offer(
    payload: LandlordOfferCreateIn,
    user: dict = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> OfferDetailOut:
    repo = OfferRepository(db)
    values = payload.model_dump()
    if values.get("total_monthly_cost") is None:
        values["total_monthly_cost"] = _compute_total_monthly_cost(
            values["price"], values.get("additional_cost"), values.get("has_additional_cost")
        )
    values["owner_user_id"] = user["id"]
    values["source"] = "landlord"
    values["status"] = "pending"
    return repo.create(values)


@router.patch("/{offer_id}", response_model=OfferDetailOut)
def update_my_offer(
    offer_id: str,
    payload: LandlordOfferUpdateIn,
    user: dict = Depends(require_landlord),
    db: Session = Depends(get_db),
) -> OfferDetailOut:
    repo = OfferRepository(db)
    existing = repo.get_by_id(offer_id)
    if existing is None or existing.get("owner_user_id") != user["id"]:
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")

    values = payload.model_dump(exclude_unset=True)
    # Każda edycja ogłoszenia wraca do kolejki moderacji - niezależnie od
    # tego, czy było wcześniej zatwierdzone czy odrzucone.
    values["status"] = "pending"
    values["rejection_reason"] = None

    updated = repo.update(offer_id, values)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")
    return updated


@router.delete("/{offer_id}", response_model=LandlordOfferDeleteOut)
def delete_my_offer(offer_id: str, user: dict = Depends(require_landlord), db: Session = Depends(get_db)) -> LandlordOfferDeleteOut:
    repo = OfferRepository(db)
    existing = repo.get_by_id(offer_id)
    if existing is None or existing.get("owner_user_id") != user["id"]:
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")

    repo.delete(offer_id)
    return LandlordOfferDeleteOut(status="deleted", id=offer_id)
