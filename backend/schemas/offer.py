from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict

from backend.schemas.analysis import OfferWarningOut

OfferStatus = Literal["pending", "approved", "rejected"]
OfferSource = Literal["olx", "landlord"]
OfferCategory = Literal["room", "apartment"]


class OfferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    city: str = "WARSZAWA"
    category: OfferCategory = "room"
    district: Optional[str] = None
    price: Optional[float] = None
    area_m2: Optional[float] = None
    negotiable: Optional[bool] = None
    link: Optional[str] = None
    address: Optional[str] = None
    additional_cost: Optional[float] = None
    has_additional_cost: Optional[bool] = None
    deposit: Optional[float] = None
    has_deposit_cost: Optional[bool] = None
    has_deposit: Optional[bool] = None
    total_monthly_cost: Optional[float] = None
    photos: list[str] = []
    views_count: int = 0
    status: OfferStatus = "approved"
    source: OfferSource = "olx"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: Optional[str] = None
    # Ostrzeżenia wykryte przez system oznaczania podejrzanych ofert (patrz
    # backend/services/suspicious_offers_service.py). Pusta lista = brak
    # zastrzeżeń. Domyślnie [] - endpointy, które nie liczą ostrzeżeń
    # (np. panel administratora), po prostu nie muszą go ustawiać.
    warnings: list[OfferWarningOut] = []


class OfferDetailOut(OfferOut):
    description: Optional[str] = None
    updated_at: Optional[str] = None
    owner_user_id: Optional[int] = None
    rejection_reason: Optional[str] = None
    favorites_count: int = 0


class Pagination(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class OfferListOut(BaseModel):
    data: list[OfferOut]
    pagination: Pagination
