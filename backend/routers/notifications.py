"""
Router centrum powiadomień - odczyt historii powiadomień zalogowanego
użytkownika i oznaczanie ich jako przeczytane. Powiadomienia są tworzone
wyłącznie przez `backend.services.notification_service` (patrz integracja z
synchronizacją OLX w `backend/services/sync_service.py::sync_once`) - ten
router ich nie tworzy, tylko czyta/aktualizuje status `is_read`.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.dependencies import require_user
from backend.repositories.notification_repository import NotificationRepository
from backend.schemas.notification import MarkAllReadOut, NotificationListOut, NotificationOut
from backend.schemas.offer import Pagination

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListOut)
def list_notifications(
    unread_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(require_user),
    db: Session = Depends(get_db),
) -> NotificationListOut:
    repo = NotificationRepository(db)
    rows, total = repo.list_for_user(user["id"], unread_only=unread_only, page=page, limit=limit)
    total_pages = (total + limit - 1) // limit if total else 0
    return NotificationListOut(
        data=[NotificationOut(**row) for row in rows],
        pagination=Pagination(page=page, limit=limit, total=total, total_pages=total_pages),
        unread_count=repo.count_unread(user["id"]),
    )


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: int, user: dict = Depends(require_user), db: Session = Depends(get_db)
) -> NotificationOut:
    repo = NotificationRepository(db)
    notification = repo.get_by_id(notification_id)
    if notification is None or notification["user_id"] != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Powiadomienie nie zostało znalezione.")

    updated = repo.mark_read(notification_id)
    return NotificationOut(**updated)  # type: ignore[arg-type]


@router.post("/read-all", response_model=MarkAllReadOut)
def mark_all_notifications_read(user: dict = Depends(require_user), db: Session = Depends(get_db)) -> MarkAllReadOut:
    repo = NotificationRepository(db)
    marked = repo.mark_all_read(user["id"])
    return MarkAllReadOut(marked_count=marked)
