from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class SyncRunOut(BaseModel):
    id: int
    city: Optional[str] = None
    started_at: str
    finished_at: Optional[str] = None
    offers_seen: Optional[int] = None
    offers_added: Optional[int] = None
    offers_removed: Optional[int] = None
    max_page: Optional[int] = None


class SyncStatusOut(BaseModel):
    running: bool
    offers_count: int
    last_run: Optional[SyncRunOut] = None


class SyncTriggerOut(BaseModel):
    status: str
