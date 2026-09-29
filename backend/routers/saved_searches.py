"""
Router alertów ofertowych (Saved Searches) - pozwala zalogowanemu
użytkownikowi zapisać kryteria wyszukiwania ofert (przepisane z aktualnie
ustawionych filtrów na `/offers`, patrz frontend `useSavedSearches`) i
zarządzać nimi (edycja / włącz-wyłącz / usunięcie). Dopasowywanie nowych
ofert do alertów odbywa się automatycznie w
`backend.services.notification_service`, wywoływanym z synchronizacji OLX
(`backend/services/sync_service.py::sync_once`) - nie ma tu żadnego
endpointu, który "odpytuje OLX".

Każdy alert należy wyłącznie do użytkownika, który go utworzył - patrz
`_get_owned_search` poniżej, używane przez wszystkie endpointy
operujące na konkretnym `{id}`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.config import MAX_ACTIVE_SAVED_SEARCHES_PER_USER
from backend.db.session import get_db
from backend.dependencies import require_user
from backend.repositories.saved_search_repository import SavedSearchRepository
from backend.schemas.saved_search import (
    SavedSearchIn,
    SavedSearchListOut,
    SavedSearchOut,
    SavedSearchUpdateIn,
)
from backend.schemas.offer import OfferOut

router = APIRouter(prefix="/api/saved-searches", tags=["saved-searches"])


def _enrich(repo: SavedSearchRepository, search: dict) -> SavedSearchOut:
    search = dict(search)
    search["matches_count"] = repo.count_matches(search)
    search["new_notifications_count"] = repo.count_new_notifications(search["id"])
    return SavedSearchOut(**search)


def _get_owned_search(repo: SavedSearchRepository, search_id: int, user: dict) -> dict:
    """Ładuje alert po id i sprawdza, że należy do zalogowanego użytkownika -
    inny użytkownik dostaje 404 (nie 403), żeby nie ujawniać istnienia
    cudzych alertów."""
    search = repo.get_by_id(search_id)
    if search is None or search["user_id"] != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert nie został znaleziony.")
    return search


@router.get("", response_model=SavedSearchListOut)
def list_saved_searches(user: dict = Depends(require_user), db: Session = Depends(get_db)) -> SavedSearchListOut:
    repo = SavedSearchRepository(db)
    searches = repo.list_for_user(user["id"])
    return SavedSearchListOut(data=[_enrich(repo, s) for s in searches])


@router.post("", response_model=SavedSearchOut, status_code=status.HTTP_201_CREATED)
def create_saved_search(
    payload: SavedSearchIn, user: dict = Depends(require_user), db: Session = Depends(get_db)
) -> SavedSearchOut:
    repo = SavedSearchRepository(db)
    if payload.notification_enabled and repo.count_active_for_user(user["id"]) >= MAX_ACTIVE_SAVED_SEARCHES_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Osiągnięto limit {MAX_ACTIVE_SAVED_SEARCHES_PER_USER} aktywnych alertów. "
            "Wyłącz lub usuń jeden z istniejących alertów, żeby dodać kolejny.",
        )

    search = repo.create(user["id"], payload.model_dump())
    return _enrich(repo, search)


@router.get("/{search_id}", response_model=SavedSearchOut)
def get_saved_search(
    search_id: int, user: dict = Depends(require_user), db: Session = Depends(get_db)
) -> SavedSearchOut:
    repo = SavedSearchRepository(db)
    search = _get_owned_search(repo, search_id, user)
    return _enrich(repo, search)


@router.put("/{search_id}", response_model=SavedSearchOut)
def update_saved_search(
    search_id: int,
    payload: SavedSearchUpdateIn,
    user: dict = Depends(require_user),
    db: Session = Depends(get_db),
) -> SavedSearchOut:
    repo = SavedSearchRepository(db)
    _get_owned_search(repo, search_id, user)

    values = payload.model_dump(exclude_unset=True)
    if values.get("notification_enabled") and repo.count_active_for_user(user["id"]) >= MAX_ACTIVE_SAVED_SEARCHES_PER_USER:
        current = repo.get_by_id(search_id)
        if current and not current["notification_enabled"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Osiągnięto limit {MAX_ACTIVE_SAVED_SEARCHES_PER_USER} aktywnych alertów.",
            )

    updated = repo.update(search_id, values)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert nie został znaleziony.")
    return _enrich(repo, updated)


@router.delete("/{search_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_search(search_id: int, user: dict = Depends(require_user), db: Session = Depends(get_db)) -> None:
    repo = SavedSearchRepository(db)
    _get_owned_search(repo, search_id, user)
    repo.delete(search_id)


@router.post("/{search_id}/enable", response_model=SavedSearchOut)
def enable_saved_search(
    search_id: int, user: dict = Depends(require_user), db: Session = Depends(get_db)
) -> SavedSearchOut:
    repo = SavedSearchRepository(db)
    _get_owned_search(repo, search_id, user)
    if repo.count_active_for_user(user["id"]) >= MAX_ACTIVE_SAVED_SEARCHES_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Osiągnięto limit {MAX_ACTIVE_SAVED_SEARCHES_PER_USER} aktywnych alertów.",
        )
    updated = repo.set_enabled(search_id, True)
    return _enrich(repo, updated)  # type: ignore[arg-type]


@router.post("/{search_id}/disable", response_model=SavedSearchOut)
def disable_saved_search(
    search_id: int, user: dict = Depends(require_user), db: Session = Depends(get_db)
) -> SavedSearchOut:
    repo = SavedSearchRepository(db)
    _get_owned_search(repo, search_id, user)
    updated = repo.set_enabled(search_id, False)
    return _enrich(repo, updated)  # type: ignore[arg-type]


@router.get("/{search_id}/matches", response_model=list[OfferOut])
def get_saved_search_matches(
    search_id: int, user: dict = Depends(require_user), db: Session = Depends(get_db)
) -> list[OfferOut]:
    """Oferty aktualnie spełniające kryteria danego alertu - podgląd
    "wyświetl pasujące oferty" na `/alerts`."""
    repo = SavedSearchRepository(db)
    search = _get_owned_search(repo, search_id, user)
    return [OfferOut(**offer) for offer in repo.list_matches(search)]
