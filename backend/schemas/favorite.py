"""
Schematy ulubionych pokoi (`backend/routers/favorites.py`). Zalogowany
najemca (`role='tenant'`) może polubić/odpolubić ogłoszenie; panel
administratora ("Zarządzanie pokojami") widzi łączną liczbę polubień per
ogłoszenie na `OfferDetailOut.favorites_count`.
"""

from __future__ import annotations

from pydantic import BaseModel

from backend.schemas.offer import OfferDetailOut, Pagination


class FavoriteStatusOut(BaseModel):
    offer_id: str
    is_favorite: bool
    favorites_count: int


class FavoriteListOut(BaseModel):
    data: list[OfferDetailOut]
    pagination: Pagination
