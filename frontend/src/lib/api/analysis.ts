import { apiFetch, buildQueryString } from "./client";
import { filtersToQuery } from "./offers";
import type {
  AnalysisMetric,
  CostDistributionBucket,
  DistrictProfile,
  InitialCost,
  OfferFilters,
  Outliers,
  PriceVsDistrict,
  ValueScore,
} from "@/types";

export function getPriceVsDistrict(filters: OfferFilters = {}): Promise<PriceVsDistrict[]> {
  return apiFetch<PriceVsDistrict[]>(`/api/analysis/price-vs-district${buildQueryString(filtersToQuery(filters))}`);
}

export function getInitialCost(filters: OfferFilters = {}): Promise<InitialCost[]> {
  return apiFetch<InitialCost[]>(`/api/analysis/initial-cost${buildQueryString(filtersToQuery(filters))}`);
}

export function getDistrictsComparison(filters: OfferFilters = {}): Promise<DistrictProfile[]> {
  return apiFetch<DistrictProfile[]>(`/api/analysis/districts${buildQueryString(filtersToQuery(filters))}`);
}

export function getOutliers(
  metric: AnalysisMetric = "price",
  filters: OfferFilters = {},
): Promise<Outliers> {
  return apiFetch<Outliers>(`/api/analysis/outliers${buildQueryString({ metric, ...filtersToQuery(filters) })}`);
}

export function getCostDistribution(
  metric: AnalysisMetric = "total_monthly_cost",
  binSize?: number,
  filters: OfferFilters = {},
): Promise<CostDistributionBucket[]> {
  return apiFetch<CostDistributionBucket[]>(
    `/api/analysis/cost-distribution${buildQueryString({ metric, binSize, ...filtersToQuery(filters) })}`,
  );
}

export function getValueScore(filters: OfferFilters = {}): Promise<ValueScore[]> {
  return apiFetch<ValueScore[]>(`/api/analysis/value${buildQueryString(filtersToQuery(filters))}`);
}
