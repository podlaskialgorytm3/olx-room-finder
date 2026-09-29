"""
Schematy zapisanych wyszukiwań / alertów ofertowych
(`backend/routers/saved_searches.py`). Alert może utworzyć każdy zalogowany
użytkownik (najemca lub wynajmujący) na podstawie aktualnie ustawionych
filtrów na `/offers` - patrz `backend/dependencies.py::require_user`.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class SavedSearchIn(BaseModel):
    """Ciało żądania tworzącego/aktualizującego alert. Wszystkie pola
    kryteriów są opcjonalne - `None`/pominięte pole = "bez ograniczenia"."""

    name: str = Field(min_length=1, max_length=120)
    city_id: Optional[str] = None
    category: Optional[str] = None  # 'room' | 'apartment'
    districts: list[str] = Field(default_factory=list)
    min_price: Optional[float] = Field(default=None, ge=0)
    max_price: Optional[float] = Field(default=None, ge=0)
    min_area: Optional[float] = Field(default=None, ge=0)
    max_area: Optional[float] = Field(default=None, ge=0)
    source: Optional[str] = None  # 'olx' | 'landlord'
    notification_enabled: bool = True
    notify_new_offers: bool = True
    notify_price_drops: bool = True

    @field_validator("category")
    @classmethod
    def _validate_category(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in ("room", "apartment"):
            raise ValueError("category musi być 'room' albo 'apartment'.")
        return value

    @field_validator("source")
    @classmethod
    def _validate_source(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in ("olx", "landlord"):
            raise ValueError("source musi być 'olx' albo 'landlord'.")
        return value

    @field_validator("max_price")
    @classmethod
    def _validate_price_range(cls, value: Optional[float], info) -> Optional[float]:
        min_price = info.data.get("min_price")
        if value is not None and min_price is not None and value < min_price:
            raise ValueError("max_price nie może być mniejsze niż min_price.")
        return value

    @field_validator("max_area")
    @classmethod
    def _validate_area_range(cls, value: Optional[float], info) -> Optional[float]:
        min_area = info.data.get("min_area")
        if value is not None and min_area is not None and value < min_area:
            raise ValueError("max_area nie może być mniejsze niż min_area.")
        return value


class SavedSearchUpdateIn(BaseModel):
    """Częściowa aktualizacja alertu - tylko podane pola są zmieniane."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    city_id: Optional[str] = None
    category: Optional[str] = None
    districts: Optional[list[str]] = None
    min_price: Optional[float] = Field(default=None, ge=0)
    max_price: Optional[float] = Field(default=None, ge=0)
    min_area: Optional[float] = Field(default=None, ge=0)
    max_area: Optional[float] = Field(default=None, ge=0)
    source: Optional[str] = None
    notification_enabled: Optional[bool] = None
    notify_new_offers: Optional[bool] = None
    notify_price_drops: Optional[bool] = None


class SavedSearchOut(BaseModel):
    id: int
    user_id: int
    name: str
    city_id: Optional[str]
    category: Optional[str]
    districts: list[str]
    min_price: Optional[float]
    max_price: Optional[float]
    min_area: Optional[float]
    max_area: Optional[float]
    source: Optional[str]
    notification_enabled: bool
    notify_new_offers: bool
    notify_price_drops: bool
    created_at: Optional[str]
    updated_at: Optional[str]
    last_checked_at: Optional[str]
    # Pola pomocnicze, wyliczane na żądanie (patrz `SavedSearchRepository`).
    matches_count: int = 0
    new_notifications_count: int = 0


class SavedSearchListOut(BaseModel):
    data: list[SavedSearchOut]
