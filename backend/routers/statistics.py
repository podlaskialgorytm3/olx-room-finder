from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.dependencies import offer_filters_params
from backend.repositories.offer_repository import OfferFilters, OfferRepository
from backend.schemas.statistics import (
    AdditionalCostsStatsOut,
    DepositsStatsOut,
    DistrictStatsOut,
    NegotiationStatsOut,
    OverviewOut,
)
from backend.services import statistics_service

router = APIRouter(prefix="/api/statistics", tags=["statistics"])


@router.get("/overview", response_model=OverviewOut)
def get_overview(
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> OverviewOut:
    repo = OfferRepository(db)
    return statistics_service.overview(repo, filters)


@router.get("/districts", response_model=list[DistrictStatsOut])
def get_districts_stats(
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> list[DistrictStatsOut]:
    repo = OfferRepository(db)
    return statistics_service.districts_overview(repo, filters)


@router.get("/districts/{district_name}", response_model=DistrictStatsOut)
def get_district_stats(
    district_name: str,
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> DistrictStatsOut:
    repo = OfferRepository(db)
    result = statistics_service.district_detail(repo, filters, district_name)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Brak ofert dla dzielnicy '{district_name}'.")
    return result


@router.get("/price", response_model=OverviewOut)
def get_price_stats(
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> OverviewOut:
    """Alias overview - zwraca te same metryki cenowe, dla wygody klientów
    oczekujących osobnego endpointu /price zgodnie ze specyfikacją."""
    repo = OfferRepository(db)
    return statistics_service.overview(repo, filters)


@router.get("/price-distribution")
def get_price_distribution(
    filters: OfferFilters = Depends(offer_filters_params),
    binSize: float = Query(250, gt=0, description="Szerokość przedziału histogramu"),
    db: Session = Depends(get_db),
) -> list[dict]:
    repo = OfferRepository(db)
    return statistics_service.price_distribution(repo, filters, binSize)


@router.get("/deposits", response_model=DepositsStatsOut)
def get_deposits_stats(
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> DepositsStatsOut:
    repo = OfferRepository(db)
    return statistics_service.deposits_stats(repo, filters)


@router.get("/additional-costs", response_model=AdditionalCostsStatsOut)
def get_additional_costs_stats(
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> AdditionalCostsStatsOut:
    repo = OfferRepository(db)
    return statistics_service.additional_costs_stats(repo, filters)


@router.get("/negotiation", response_model=NegotiationStatsOut)
def get_negotiation_stats(
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> NegotiationStatsOut:
    repo = OfferRepository(db)
    return statistics_service.negotiation_stats(repo, filters)
