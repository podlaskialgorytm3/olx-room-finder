from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class OfferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    city: str = "WARSZAWA"
    district: Optional[str] = None
    price: Optional[float] = None
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


class OfferDetailOut(OfferOut):
    description: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class Pagination(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int


class OfferListOut(BaseModel):
    data: list[OfferOut]
    pagination: Pagination
