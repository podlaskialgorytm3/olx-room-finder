import { apiFetch, buildQueryString } from "./client";
import { filtersToQuery } from "./offers";
import type {
  AdditionalCostsStats,
  DepositsStats,
  DistrictStats,
  NegotiationStats,
  OfferFilters,
  Overview,
  PriceHistogramBucket,
} from "@/types";

export function getOverview(filters: OfferFilters = {}): Promise<Overview> {
  return apiFetch<Overview>(`/api/statistics/overview${buildQueryString(filtersToQuery(filters))}`);
}

export function getPriceSummary(filters: OfferFilters = {}): Promise<Overview> {
  return apiFetch<Overview>(`/api/statistics/price${buildQueryString(filtersToQuery(filters))}`);
}

export function getDistrictStatistics(filters: OfferFilters = {}): Promise<DistrictStats[]> {
  return apiFetch<DistrictStats[]>(`/api/statistics/districts${buildQueryString(filtersToQuery(filters))}`);
}

export function getDistrictStatisticsByName(
  districtName: string,
  filters: OfferFilters = {},
): Promise<DistrictStats> {
  return apiFetch<DistrictStats>(
    `/api/statistics/districts/${encodeURIComponent(districtName)}${buildQueryString(filtersToQuery(filters))}`,
  );
}

export function getPriceDistribution(
  binSize?: number,
  filters: OfferFilters = {},
): Promise<PriceHistogramBucket[]> {
  return apiFetch<PriceHistogramBucket[]>(
    `/api/statistics/price-distribution${buildQueryString({ binSize, ...filtersToQuery(filters) })}`,
  );
}

export function getDepositsStatistics(filters: OfferFilters = {}): Promise<DepositsStats> {
  return apiFetch<DepositsStats>(`/api/statistics/deposits${buildQueryString(filtersToQuery(filters))}`);
}

export function getAdditionalCostsStatistics(filters: OfferFilters = {}): Promise<AdditionalCostsStats> {
  return apiFetch<AdditionalCostsStats>(
    `/api/statistics/additional-costs${buildQueryString(filtersToQuery(filters))}`,
  );
}

export function getNegotiationStatistics(filters: OfferFilters = {}): Promise<NegotiationStats> {
  return apiFetch<NegotiationStats>(`/api/statistics/negotiation${buildQueryString(filtersToQuery(filters))}`);
}
