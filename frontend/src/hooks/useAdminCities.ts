"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { useAdminAuthStore } from "@/lib/admin-auth-store";
import { queryKeys } from "@/lib/query-keys";
import type { CityConfigUpdate } from "@/types";

export function useCityConfigs() {
  const token = useAdminAuthStore((state) => state.token);
  return useQuery({
    queryKey: queryKeys.adminCities(),
    queryFn: () => adminApi.getCities(),
    enabled: !!token,
    // Poll so "running" status and offer counts stay fresh while the tab is open.
    refetchInterval: 15_000,
  });
}

export function useUpdateCitySyncHour() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ city, payload }: { city: string; payload: CityConfigUpdate }) =>
      adminApi.updateCitySyncHour(city, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCities() });
    },
  });
}

export function useTriggerCitySync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (city: string) => adminApi.triggerCitySync(city),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCities() });
    },
  });
}
