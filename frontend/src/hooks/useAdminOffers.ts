"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { useAdminAuthStore } from "@/lib/admin-auth-store";
import { queryKeys } from "@/lib/query-keys";
import type { OffersQuery, OfferUpdate } from "@/types";

/** Panel administratora - "Zarządzanie pokojami": listowanie ofert z pełnym
 * filtrowaniem (miasto, dzielnica, cena, itd.) tak samo jak w publicznym
 * `/api/offers`, tylko za autoryzacją. */
export function useAdminOffers(query: OffersQuery) {
  const token = useAdminAuthStore((state) => state.token);
  return useQuery({
    queryKey: queryKeys.adminOffers(query),
    queryFn: () => adminApi.getAdminOffers(query),
    enabled: !!token,
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminOffer(id: string | undefined) {
  const token = useAdminAuthStore((state) => state.token);
  return useQuery({
    queryKey: queryKeys.adminOffer(id ?? ""),
    queryFn: () => adminApi.getAdminOffer(id as string),
    enabled: !!token && Boolean(id),
  });
}

export function useAdminOfferDistricts(city: string | undefined) {
  const token = useAdminAuthStore((state) => state.token);
  return useQuery({
    queryKey: queryKeys.adminOfferDistricts(city),
    queryFn: () => adminApi.getAdminOfferDistricts(city),
    enabled: !!token,
    staleTime: 60_000,
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: OfferUpdate }) => adminApi.updateOffer(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "offers"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminOffer(updated.id) });
      queryClient.invalidateQueries({ queryKey: ["admin", "offer-districts"] });
    },
  });
}

export function useDeleteOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "offers"] });
    },
  });
}
