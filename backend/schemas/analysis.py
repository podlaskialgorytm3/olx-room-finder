from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class PriceVsDistrictOut(BaseModel):
    id: str
    title: str
    district: Optional[str] = None
    price: Optional[float] = None
    district_median: Optional[float] = None
    difference: Optional[float] = None
    difference_percent: Optional[float] = None


class InitialCostOut(BaseModel):
    id: str
    title: str
    total_monthly_cost: Optional[float] = None
    deposit: Optional[float] = None
    initial_cost: Optional[float] = None
    initial_cost_is_estimate: bool


class DistrictProfileOut(BaseModel):
    district: str
    count: int
    median_price: Optional[float] = None
    median_total_monthly_cost: Optional[float] = None
    median_deposit: Optional[float] = None
    negotiable_percent: Optional[float] = None
    no_deposit_percent: Optional[float] = None
    has_additional_cost_percent: Optional[float] = None


class OutlierBoundsOut(BaseModel):
    q1: Optional[float] = None
    q3: Optional[float] = None
    iqr: Optional[float] = None
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None


class OutlierItemOut(BaseModel):
    id: str
    title: str
    metric: str
    value: float


class OutliersOut(BaseModel):
    metric: str
    bounds: Optional[OutlierBoundsOut] = None
    outliers: list[OutlierItemOut]


class ValueScoreComponentsOut(BaseModel):
    price_z_score: Optional[float] = None
    total_cost_z_score: Optional[float] = None
    negotiable_bonus: float
    deposit_penalty: float


class ValueScoreOut(BaseModel):
    id: str
    title: str
    district: Optional[str] = None
    value_score: Optional[float] = None
    reason: Optional[str] = None
    components: Optional[ValueScoreComponentsOut] = None
