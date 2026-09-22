"use client";

import { useQuery } from "@tanstack/react-query";
import { statisticsApi } from "@/lib/api";
import { useSelectedCity } from "@/lib/city-store";
import { queryKeys } from "@/lib/query-keys";
import type { OfferFilters } from "@/types";

export function useStatisticsOverview(filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.statisticsOverview(scoped),
    queryFn: () => statisticsApi.getOverview(scoped),
  });
}

export function useDistrictStatistics(filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.statisticsDistricts(scoped),
    queryFn: () => statisticsApi.getDistrictStatistics(scoped),
  });
}

export function useDistrictStatisticsByName(districtName: string | undefined, filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.statisticsDistrict(districtName ?? "", scoped),
    queryFn: () => statisticsApi.getDistrictStatisticsByName(districtName as string, scoped),
    enabled: Boolean(districtName),
  });
}

export function usePriceDistribution(binSize?: number, filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.priceDistribution(binSize, scoped),
    queryFn: () => statisticsApi.getPriceDistribution(binSize, scoped),
  });
}

export function useDepositsStatistics(filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.deposits(scoped),
    queryFn: () => statisticsApi.getDepositsStatistics(scoped),
  });
}

export function useAdditionalCostsStatistics(filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.additionalCosts(scoped),
    queryFn: () => statisticsApi.getAdditionalCostsStatistics(scoped),
  });
}

export function useNegotiationStatistics(filters: OfferFilters = {}) {
  const city = useSelectedCity();
  const scoped = { city, ...filters };
  return useQuery({
    queryKey: queryKeys.negotiation(scoped),
    queryFn: () => statisticsApi.getNegotiationStatistics(scoped),
  });
}
