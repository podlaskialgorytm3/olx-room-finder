from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator

from backend.schemas.offer import OfferDetailOut, Pagination
from backend.schemas.sync import SyncRunOut

CITY_CODE_PATTERN = r"^[A-Za-z0-9_]{2,50}$"


class CityConfigOut(BaseModel):
    city: str
    display_name: str
    link: Optional[str] = None
    sync_hour: int
    sync_minute: int
    offers_count: int
    running: bool
    cancelling: bool = False
    last_run: Optional[SyncRunOut] = None


class CityConfigCreateIn(BaseModel):
    city: str = Field(
        pattern=CITY_CODE_PATTERN,
        description="Kod miasta (litery/cyfry/podkreślenie, np. LUBLIN).",
    )
    display_name: str = Field(min_length=1, max_length=100, description="Nazwa wyświetlana, np. Lublin.")
    link: str = Field(description="Link do listingu OLX kategorii pokoje/stancje dla tego miasta.")
    sync_hour: int = Field(default=2, ge=0, le=23, description="Godzina codziennej synchronizacji (0-23)")
    sync_minute: int = Field(default=0, ge=0, le=59, description="Minuta codziennej synchronizacji (0-59)")

    @field_validator("city")
    @classmethod
    def _normalize_city(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("display_name")
    @classmethod
    def _strip_display_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Nazwa miasta nie może być pusta.")
        return value


class CityConfigUpdateIn(BaseModel):
    sync_hour: int = Field(ge=0, le=23, description="Godzina codziennej synchronizacji (0-23)")
    sync_minute: int = Field(ge=0, le=59, description="Minuta codziennej synchronizacji (0-59)")
    display_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    link: Optional[str] = Field(default=None, description="Nowy link do listingu OLX (opcjonalnie).")


class CitySyncTriggerOut(BaseModel):
    status: str
    city: str


class CitySyncCancelOut(BaseModel):
    status: str
    city: str


class CityDeleteOut(BaseModel):
    status: str
    city: str


class OfferAdminListOut(BaseModel):
    data: list[OfferDetailOut]
    pagination: Pagination


class OfferUpdateIn(BaseModel):
    """Pola oferty edytowalne z panelu administratora. Wszystkie pola są
    opcjonalne (PATCH z częściową aktualizacją) - pozwala to poprawiać
    pojedyncze błędy, np. źle rozpoznaną dzielnicę czy kwotę kaucji, bez
    konieczności przesyłania całego rekordu."""

    title: Optional[str] = Field(default=None, min_length=1)
    city: Optional[str] = Field(default=None, min_length=1)
    district: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    negotiable: Optional[bool] = None
    link: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    additional_cost: Optional[float] = Field(default=None, ge=0)
    has_additional_cost: Optional[bool] = None
    deposit: Optional[float] = Field(default=None, ge=0)
    has_deposit_cost: Optional[bool] = None
    has_deposit: Optional[bool] = None
    total_monthly_cost: Optional[float] = Field(default=None, ge=0)
    photos: Optional[list[str]] = None

    @field_validator("city")
    @classmethod
    def _normalize_offer_city(cls, value: Optional[str]) -> Optional[str]:
        return value.strip().upper() if value else value

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Tytuł nie może być pusty.")
        return value


class OfferDeleteOut(BaseModel):
    status: str
    id: str
