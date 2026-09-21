"""
Wspólna zależność FastAPI parsująca filtry ofert z query params. Używana
przez routery /offers, /statistics i /analysis, żeby wszystkie trzy sekcje
mogły filtrować dokładnie tak samo (np. `/statistics/price?district=Mokotów`
działa identycznie jak filtr w `/offers`).
"""

from __future__ import annotations

from typing import Optional

from fastapi import Header, HTTPException, Query, status

from backend.repositories.offer_repository import OfferFilters
from backend.services import auth_service


def offer_filters_params(
    district: Optional[str] = Query(None, description="Filtr po dzielnicy"),
    minPrice: Optional[float] = Query(None, ge=0),
    maxPrice: Optional[float] = Query(None, ge=0),
    minTotalMonthlyCost: Optional[float] = Query(None, ge=0),
    maxTotalMonthlyCost: Optional[float] = Query(None, ge=0),
    negotiable: Optional[bool] = Query(None),
    hasAdditionalCost: Optional[bool] = Query(None),
    hasDeposit: Optional[bool] = Query(None),
    hasDepositCost: Optional[bool] = Query(None),
    search: Optional[str] = Query(None, min_length=1, description="Szuka w title/description/address"),
) -> OfferFilters:
    return OfferFilters(
        district=district,
        min_price=minPrice,
        max_price=maxPrice,
        min_total_monthly_cost=minTotalMonthlyCost,
        max_total_monthly_cost=maxTotalMonthlyCost,
        negotiable=negotiable,
        has_additional_cost=hasAdditionalCost,
        has_deposit=hasDeposit,
        has_deposit_cost=hasDepositCost,
        search=search,
    )


def require_admin(authorization: Optional[str] = Header(default=None)) -> str:
    """Dependency chroniąca endpointy panelu administratora - oczekuje
    nagłówka `Authorization: Bearer <token>` z tokenem uzyskanym przez
    `POST /api/auth/login`. Zwraca nazwę zalogowanego użytkownika."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Brak tokenu uwierzytelniającego.")

    token = authorization.split(" ", 1)[1].strip()
    username = auth_service.validate_token(token)
    if username is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nieprawidłowy lub wygasły token.")
    return username
