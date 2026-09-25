"""
Schematy panelu wynajmującego - tworzenie i edycja własnych ogłoszeń
(`backend/routers/landlord.py`). Nowe ogłoszenie zawsze trafia ze statusem
`pending` i wymaga zatwierdzenia przez administratora (panel "Zarządzanie
pokojami", `PATCH /api/admin/offers/{id}` z `status=approved`), zanim
pojawi się w publicznym `/api/offers`.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator

from backend.schemas.offer import OfferDetailOut, Pagination


class LandlordOfferCreateIn(BaseModel):
    """Formularz dodania nowego ogłoszenia przez wynajmującego. Zdjęcia na
    razie podawane są jako lista linków (URL-e), bez uploadu plików."""

    title: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, description="Kod miasta (litery/cyfry/podkreślenie, np. WARSZAWA).")
    district: Optional[str] = None
    price: float = Field(ge=0, description="Cena podstawowa (bez dodatkowych opłat).")
    negotiable: Optional[bool] = None
    description: Optional[str] = None
    address: Optional[str] = None
    additional_cost: Optional[float] = Field(default=None, ge=0)
    has_additional_cost: Optional[bool] = None
    deposit: Optional[float] = Field(default=None, ge=0)
    has_deposit: Optional[bool] = None
    has_deposit_cost: Optional[bool] = None
    total_monthly_cost: Optional[float] = Field(
        default=None, ge=0, description="Jeśli pominięte, wyliczane automatycznie z ceny i dodatkowych opłat."
    )
    link: Optional[str] = Field(default=None, description="Opcjonalny link do ogłoszenia w innym serwisie.")
    photos: list[str] = Field(default_factory=list, description="Lista linków (URL) do zdjęć ogłoszenia.")

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Tytuł nie może być pusty.")
        return value

    @field_validator("city")
    @classmethod
    def _normalize_city(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("photos")
    @classmethod
    def _strip_photos(cls, value: list[str]) -> list[str]:
        return [photo.strip() for photo in value if photo and photo.strip()]


class LandlordOfferUpdateIn(BaseModel):
    """Edycja własnego ogłoszenia - wszystkie pola opcjonalne (PATCH).
    Każda edycja resetuje status do `pending` (ponowna weryfikacja przez
    administratora), niezależnie od poprzedniego statusu."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    city: Optional[str] = Field(default=None, min_length=1)
    district: Optional[str] = None
    price: Optional[float] = Field(default=None, ge=0)
    negotiable: Optional[bool] = None
    description: Optional[str] = None
    address: Optional[str] = None
    additional_cost: Optional[float] = Field(default=None, ge=0)
    has_additional_cost: Optional[bool] = None
    deposit: Optional[float] = Field(default=None, ge=0)
    has_deposit: Optional[bool] = None
    has_deposit_cost: Optional[bool] = None
    total_monthly_cost: Optional[float] = Field(default=None, ge=0)
    link: Optional[str] = None
    photos: Optional[list[str]] = None

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Tytuł nie może być pusty.")
        return value

    @field_validator("city")
    @classmethod
    def _normalize_city(cls, value: Optional[str]) -> Optional[str]:
        return value.strip().upper() if value else value

    @field_validator("photos")
    @classmethod
    def _strip_photos(cls, value: Optional[list[str]]) -> Optional[list[str]]:
        if value is None:
            return value
        return [photo.strip() for photo in value if photo and photo.strip()]


class LandlordOfferListOut(BaseModel):
    data: list[OfferDetailOut]
    pagination: Pagination


class LandlordOfferDeleteOut(BaseModel):
    status: str
    id: str
