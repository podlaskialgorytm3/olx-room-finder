from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.dependencies import offer_filters_params
from backend.repositories.offer_repository import OfferFilters, OfferRepository
from backend.schemas.analysis import (
    DistrictProfileOut,
    InitialCostOut,
    OutliersOut,
    PriceVsDistrictOut,
    ValueScoreOut,
)
from backend.services import analysis_service

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

MetricField = Literal["price", "total_monthly_cost", "additional_cost", "deposit"]


@router.get("/price-vs-district", response_model=list[PriceVsDistrictOut])
def get_price_vs_district(
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> list[PriceVsDistrictOut]:
    repo = OfferRepository(db)
    return analysis_service.price_vs_district(repo, filters)


@router.get("/initial-cost", response_model=list[InitialCostOut])
def get_initial_cost(
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> list[InitialCostOut]:
    repo = OfferRepository(db)
    return analysis_service.initial_cost(repo, filters)


@router.get("/districts", response_model=list[DistrictProfileOut])
def get_districts_comparison(
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> list[DistrictProfileOut]:
    repo = OfferRepository(db)
    return analysis_service.districts_comparison(repo, filters)


@router.get("/outliers", response_model=OutliersOut)
def get_outliers(
    metric: MetricField = Query("price"),
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> OutliersOut:
    repo = OfferRepository(db)
    try:
        return analysis_service.outliers(repo, filters, metric)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/cost-distribution")
def get_cost_distribution(
    metric: MetricField = Query("total_monthly_cost"),
    binSize: float = Query(250, gt=0),
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> list[dict]:
    repo = OfferRepository(db)
    try:
        return analysis_service.cost_distribution(repo, filters, metric, binSize)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/value", response_model=list[ValueScoreOut])
def get_value_score(
    filters: OfferFilters = Depends(offer_filters_params),
    db: Session = Depends(get_db),
) -> list[ValueScoreOut]:
    repo = OfferRepository(db)
    return analysis_service.value_score(repo, filters)
