"use client";

import { useQuery } from "@tanstack/react-query";
import { citiesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

/** Public list of cities available for browsing offers (no login required). */
export function usePublicCities() {
  return useQuery({
    queryKey: queryKeys.publicCities(),
    queryFn: () => citiesApi.getPublicCities(),
    staleTime: 5 * 60_000,
  });
}
