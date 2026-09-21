"""
Punkt wejścia backendu REST API.

Backend jest wyłącznie warstwą odczytu/analizy nad `data.db` - nie wykonuje
scrapingu ani synchronizacji (tym nadal zajmuje się `daily_sync.py`).
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import analysis, offers, statistics

app = FastAPI(
    title="OLX Room Finder API",
    description="Warstwa analityczna nad danymi ofert OLX zebranymi przez daily_sync.py.",
    version="1.0.0",
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


@app.get("/api/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
