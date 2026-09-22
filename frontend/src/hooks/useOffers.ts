"use client";

import { useQuery } from "@tanstack/react-query";
import { offersApi } from "@/lib/api";
import { useSelectedCity } from "@/lib/city-store";
import { queryKeys } from "@/lib/query-keys";
import type { OffersQuery } from "@/types";

export function useOffers(query: OffersQuery) {
  const city = useSelectedCity();
  const scoped = { city, ...query };
  return useQuery({
    queryKey: queryKeys.offers(scoped),
    queryFn: () => offersApi.getOffers(scoped),
    placeholderData: (previousData) => previousData,
  });
}

export function useOffer(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.offer(id ?? ""),
    queryFn: () => offersApi.getOffer(id as string),
    enabled: Boolean(id),
  });
}
