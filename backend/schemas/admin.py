from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from backend.schemas.sync import SyncRunOut


class CityConfigOut(BaseModel):
    city: str
    display_name: str
    sync_hour: int
    sync_minute: int
    offers_count: int
    running: bool
    last_run: Optional[SyncRunOut] = None


class CityConfigUpdateIn(BaseModel):
    sync_hour: int = Field(ge=0, le=23, description="Godzina codziennej synchronizacji (0-23)")
    sync_minute: int = Field(ge=0, le=59, description="Minuta codziennej synchronizacji (0-59)")


class CitySyncTriggerOut(BaseModel):
    status: str
    city: str
