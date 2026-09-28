"""
Router ulubionych pokoi - pozwala zalogowanemu najemcy (`role='tenant'`,
patrz `backend/dependencies.py::require_tenant`) dodawać i usuwać ogłoszenia
z ulubionych oraz przeglądać własną listę ulubionych. Liczba polubień per
ogłoszenie jest widoczna dla administratora w panelu "Zarządzanie pokojami"
(`OfferDetailOut.favorites_count`, patrz `backend/routers/admin.py`).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.dependencies import require_tenant
from backend.repositories.favorite_repository import FavoriteRepository
from backend.repositories.offer_repository import OfferRepository
from backend.schemas.favorite import FavoriteListOut, FavoriteStatusOut
from backend.schemas.offer import Pagination

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("", response_model=FavoriteListOut)
def list_my_favorites(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=200),
    user: dict = Depends(require_tenant),
    db: Session = Depends(get_db),
) -> FavoriteListOut:
    repo = FavoriteRepository(db)
    rows, total = repo.list_offers_for_user(user["id"], page=page, limit=limit)
    for row in rows:
        row["favorites_count"] = repo.count_for_offer(row["id"])
    total_pages = (total + limit - 1) // limit if total else 0
    return FavoriteListOut(
        data=rows,
        pagination=Pagination(page=page, limit=limit, total=total, total_pages=total_pages),
    )


@router.get("/ids", response_model=list[str])
def list_my_favorite_ids(user: dict = Depends(require_tenant), db: Session = Depends(get_db)) -> list[str]:
    """Zwraca id wszystkich ogłoszeń polubionych przez zalogowanego najemcę -
    pozwala frontendowi oznaczyć serduszkiem odpowiednie karty na liście
    ofert bez odpytywania backendu osobno dla każdej z nich."""
    repo = FavoriteRepository(db)
    return repo.favorite_ids_for_user(user["id"])


@router.get("/{offer_id}", response_model=FavoriteStatusOut)
def get_favorite_status(
    offer_id: str, user: dict = Depends(require_tenant), db: Session = Depends(get_db)
) -> FavoriteStatusOut:
    repo = FavoriteRepository(db)
    return FavoriteStatusOut(
        offer_id=offer_id,
        is_favorite=repo.is_favorited(user["id"], offer_id),
        favorites_count=repo.count_for_offer(offer_id),
    )


@router.post("/{offer_id}", response_model=FavoriteStatusOut, status_code=201)
def add_favorite(
    offer_id: str, user: dict = Depends(require_tenant), db: Session = Depends(get_db)
) -> FavoriteStatusOut:
    offer_repo = OfferRepository(db)
    if offer_repo.get_by_id(offer_id) is None:
        raise HTTPException(status_code=404, detail=f"Oferta o id={offer_id} nie została znaleziona.")

    repo = FavoriteRepository(db)
    repo.add(user["id"], offer_id)
    return FavoriteStatusOut(
        offer_id=offer_id,
        is_favorite=True,
        favorites_count=repo.count_for_offer(offer_id),
    )


@router.delete("/{offer_id}", response_model=FavoriteStatusOut)
def remove_favorite(
    offer_id: str, user: dict = Depends(require_tenant), db: Session = Depends(get_db)
) -> FavoriteStatusOut:
    repo = FavoriteRepository(db)
    repo.remove(user["id"], offer_id)
    return FavoriteStatusOut(
        offer_id=offer_id,
        is_favorite=False,
        favorites_count=repo.count_for_offer(offer_id),
    )
