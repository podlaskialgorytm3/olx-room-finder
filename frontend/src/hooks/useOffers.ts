"use client";

import { useQuery } from "@tanstack/react-query";
import { offersApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { OffersQuery } from "@/types";

export function useOffers(query: OffersQuery) {
  return useQuery({
    queryKey: queryKeys.offers(query),
    queryFn: () => offersApi.getOffers(query),
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
