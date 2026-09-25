"""
Punkt wejścia backendu REST API.

Backend to jeden, spójny system: obsługuje zarówno REST API (odczyt/analiza
danych) jak i synchronizację ofert OLX z bazą `data.db` (dawniej osobny
skrypt `daily_sync.py`, obecnie `backend/services/sync_service.py`). Przy
starcie procesu backend inicjalizuje bazę danych i uruchamia w tle
harmonogram codziennej synchronizacji; synchronizację można też wyzwolić
ręcznie przez `POST /api/sync/run`.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import ENABLE_SYNC_SCHEDULER
from backend.routers import admin, admin_users, analysis, auth, cities, landlord, offers, statistics, sync, users
from backend.services import auth_service, sync_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    sync_service.init_db()
    auth_service.ensure_default_admin()
    if ENABLE_SYNC_SCHEDULER:
        sync_service.start_background_scheduler()
    yield


app = FastAPI(
    title="OLX Room Finder API",
    description=(
        "Jeden backend łączący REST API (odczyt/analiza ofert) z usługą "
        "synchronizacji ofert OLX z bazą danych."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(offers.router)
app.include_router(statistics.router)
app.include_router(analysis.router)
app.include_router(sync.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(admin_users.router)
app.include_router(users.router)
app.include_router(landlord.router)
app.include_router(cities.router)


@app.get("/api/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
