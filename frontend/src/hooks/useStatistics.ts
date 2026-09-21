"use client";

import { useQuery } from "@tanstack/react-query";
import { statisticsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { OfferFilters } from "@/types";

export function useStatisticsOverview(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.statisticsOverview(filters),
    queryFn: () => statisticsApi.getOverview(filters),
  });
}

export function useDistrictStatistics(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.statisticsDistricts(filters),
    queryFn: () => statisticsApi.getDistrictStatistics(filters),
  });
}

export function useDistrictStatisticsByName(districtName: string | undefined, filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.statisticsDistrict(districtName ?? "", filters),
    queryFn: () => statisticsApi.getDistrictStatisticsByName(districtName as string, filters),
    enabled: Boolean(districtName),
  });
}

export function usePriceDistribution(binSize?: number, filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.priceDistribution(binSize, filters),
    queryFn: () => statisticsApi.getPriceDistribution(binSize, filters),
  });
}

export function useDepositsStatistics(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.deposits(filters),
    queryFn: () => statisticsApi.getDepositsStatistics(filters),
  });
}

export function useAdditionalCostsStatistics(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.additionalCosts(filters),
    queryFn: () => statisticsApi.getAdditionalCostsStatistics(filters),
  });
}

export function useNegotiationStatistics(filters: OfferFilters = {}) {
  return useQuery({
    queryKey: queryKeys.negotiation(filters),
    queryFn: () => statisticsApi.getNegotiationStatistics(filters),
  });
}
