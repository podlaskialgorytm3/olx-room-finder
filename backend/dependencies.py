"""
Wspólna zależność FastAPI parsująca filtry ofert z query params. Używana
przez routery /offers, /statistics i /analysis, żeby wszystkie trzy sekcje
mogły filtrować dokładnie tak samo (np. `/statistics/price?district=Mokotów`
działa identycznie jak filtr w `/offers`).
"""

from __future__ import annotations

from typing import Optional

from fastapi import Query

from backend.repositories.offer_repository import OfferFilters


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
