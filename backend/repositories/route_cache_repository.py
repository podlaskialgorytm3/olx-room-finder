"""
Opcjonalny cache wyników "Sprawdź dojazd" (patrz `backend/services/
routing_service.py`). Klucz to (offer_id, destination_query znormalizowany
do lower/trim), żeby ten sam użytkownik wpisujący "Politechnika Warszawska"
i " politechnika warszawska " trafiał w ten sam wpis.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from backend.db.models import offer_routes_cache


def normalize_destination(destination: str) -> str:
    return " ".join(destination.strip().lower().split())


class RouteCacheRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, offer_id: str, destination: str) -> Optional[dict[str, Any]]:
        stmt = select(offer_routes_cache).where(
            offer_routes_cache.c.offer_id == offer_id,
            offer_routes_cache.c.destination_query == normalize_destination(destination),
        )
        row = self.db.execute(stmt).first()
        return dict(row._mapping) if row else None

    def set(
        self,
        offer_id: str,
        destination: str,
        destination_label: Optional[str],
        distance_km: float,
        duration_min: int,
    ) -> None:
        # "Upsert" - jeśli ta para (offer_id, destination) była już policzona
        # wcześniej, po prostu odświeżamy wynik zamiast łapać IntegrityError.
        stmt = sqlite_insert(offer_routes_cache).values(
            offer_id=offer_id,
            destination_query=normalize_destination(destination),
            destination_label=destination_label,
            distance_km=distance_km,
            duration_min=duration_min,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[offer_routes_cache.c.offer_id, offer_routes_cache.c.destination_query],
            set_={
                "destination_label": destination_label,
                "distance_km": distance_km,
                "duration_min": duration_min,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        self.db.execute(stmt)
        self.db.commit()
