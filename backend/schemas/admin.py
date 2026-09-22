from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator

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


class CityDeleteOut(BaseModel):
    status: str
    city: str
