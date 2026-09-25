"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { landlordApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useUserAuthStore } from "@/lib/user-auth-store";
import type { LandlordOfferCreate, LandlordOfferUpdate } from "@/types";

/** Panel wynajmującego - lista własnych ogłoszeń (dowolny status: pending/approved/rejected). */
export function useMyOffers(page = 1, limit = 20) {
  const token = useUserAuthStore((state) => state.token);
  return useQuery({
    queryKey: queryKeys.landlordOffers(page, limit),
    queryFn: () => landlordApi.getMyOffers(page, limit),
    enabled: !!token,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateMyOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: LandlordOfferCreate) => landlordApi.createMyOffer(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord", "offers"] });
    },
  });
}

export function useUpdateMyOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LandlordOfferUpdate }) => landlordApi.updateMyOffer(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["landlord", "offers"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.landlordOffer(updated.id) });
    },
  });
}

export function useDeleteMyOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => landlordApi.deleteMyOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landlord", "offers"] });
    },
  });
}
