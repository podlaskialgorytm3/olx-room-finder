"use client";

import { useQuery } from "@tanstack/react-query";
import { analysisApi } from "@/lib/api";
import { useSelectedCity } from "@/lib/city-store";
import { queryKeys } from "@/lib/query-keys";
import type { AnalysisMetric, OfferFilters } from "@/types";

export function usePriceVsDistrict(filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.priceVsDistrict(scoped),
    queryFn: () => analysisApi.getPriceVsDistrict(scoped),
  });
}

export function useInitialCost(filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.initialCost(scoped),
    queryFn: () => analysisApi.getInitialCost(scoped),
  });
}

export function useDistrictsComparison(filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.districtsComparison(scoped),
    queryFn: () => analysisApi.getDistrictsComparison(scoped),
  });
}

export function useOutliers(metric: AnalysisMetric = "price", filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.outliers(metric, scoped),
    queryFn: () => analysisApi.getOutliers(metric, scoped),
  });
}

export function useCostDistribution(metric: AnalysisMetric = "total_monthly_cost", binSize?: number, filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.costDistribution(metric, binSize, scoped),
    queryFn: () => analysisApi.getCostDistribution(metric, binSize, scoped),
  });
}

export function useValueScore(filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.valueScore(scoped),
    queryFn: () => analysisApi.getValueScore(scoped),
  });
}
