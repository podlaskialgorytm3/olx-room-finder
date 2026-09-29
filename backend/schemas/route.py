"""Schematy Pydantic dla funkcji "Sprawdź dojazd" (patrz
`backend/services/routing_service.py` i `backend/routers/routing.py`)."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class RouteRequestIn(BaseModel):
    destination: str = Field(..., min_length=1, max_length=200, description="Miejsce docelowe, np. 'Politechnika Warszawska'.")


class RouteResultOut(BaseModel):
    duration_min: int
    distance_km: float
    destination_label: Optional[str] = None
