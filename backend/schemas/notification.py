"""
Schematy centrum powiadomień (`backend/routers/notifications.py`).
Powiadomienia są tworzone automatycznie przez
`backend.services.notification_service` (podczas synchronizacji OLX) i
tylko odczytywane/oznaczane jako przeczytane przez ten router.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from backend.schemas.offer import Pagination


class NotificationOut(BaseModel):
    id: int
    user_id: int
    saved_search_id: Optional[int]
    offer_id: Optional[str]
    type: str  # 'NEW_OFFER' | 'PRICE_DROP' | 'OFFER_REMOVED'
    title: str
    message: str
    is_read: bool
    created_at: Optional[str]


class NotificationListOut(BaseModel):
    data: list[NotificationOut]
    pagination: Pagination
    unread_count: int


class MarkAllReadOut(BaseModel):
    marked_count: int
