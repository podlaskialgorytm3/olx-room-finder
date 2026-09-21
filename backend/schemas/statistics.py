from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class MetricSummary(BaseModel):
    avg: Optional[float] = None
    median: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None


class OverviewOut(BaseModel):
    count: int
    price: MetricSummary
    total_monthly_cost: MetricSummary


class DistrictStatsOut(BaseModel):
    district: str
    count: int
    price: MetricSummary
    total_monthly_cost: MetricSummary


class DepositsStatsOut(BaseModel):
    with_deposit: int
    without_deposit: int
    unknown: int
    with_deposit_percent: Optional[float] = None
    avg_deposit: Optional[float] = None
    median_deposit: Optional[float] = None


class AdditionalCostsStatsOut(BaseModel):
    with_additional_cost: int
    without_additional_cost: int
    unknown: int
    with_additional_cost_percent: Optional[float] = None
    avg_additional_cost: Optional[float] = None
    median_additional_cost: Optional[float] = None


class NegotiationStatsOut(BaseModel):
    negotiable: int
    non_negotiable: int
    negotiable_percent: Optional[float] = None
