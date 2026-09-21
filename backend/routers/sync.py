"""
Router zarządzający synchronizacją ofert OLX. Pozwala sprawdzić status
ostatniego przebiegu oraz ręcznie wyzwolić synchronizację, bez czekania na
harmonogram (patrz backend/services/sync_service.py).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.schemas.sync import SyncRunOut, SyncStatusOut, SyncTriggerOut
from backend.services import sync_service

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.get("/status", response_model=SyncStatusOut)
def get_sync_status() -> SyncStatusOut:
    last_run = sync_service.get_last_run()
    return SyncStatusOut(
        running=sync_service.is_sync_running(),
        offers_count=sync_service.count_offers(),
        last_run=SyncRunOut(**last_run) if last_run else None,
    )


@router.post("/run", response_model=SyncTriggerOut, status_code=202)
def trigger_sync() -> SyncTriggerOut:
    started = sync_service.trigger_manual_sync()
    if not started:
        raise HTTPException(status_code=409, detail="Synchronizacja już trwa.")
    return SyncTriggerOut(status="started")
