"use client";

import { useQuery } from "@tanstack/react-query";
import { analysisApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { AnalysisMetric, OfferFilters } from "@/types";

export function usePriceVsDistrict(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.priceVsDistrict(filters),
    queryFn: () => analysisApi.getPriceVsDistrict(filters),
  });
}

export function useInitialCost(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.initialCost(filters),
    queryFn: () => analysisApi.getInitialCost(filters),
  });
}

export function useDistrictsComparison(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.districtsComparison(filters),
    queryFn: () => analysisApi.getDistrictsComparison(filters),
  });
}

export function useOutliers(metric: AnalysisMetric = "price", filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.outliers(metric, filters),
    queryFn: () => analysisApi.getOutliers(metric, filters),
  });
}

export function useCostDistribution(metric: AnalysisMetric = "total_monthly_cost", binSize?: number, filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.costDistribution(metric, binSize, filters),
    queryFn: () => analysisApi.getCostDistribution(metric, binSize, filters),
  });
}

export function useValueScore(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.valueScore(filters),
    queryFn: () => analysisApi.getValueScore(filters),
  });
}
