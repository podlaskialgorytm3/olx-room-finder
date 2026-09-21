"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { syncApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useSyncStatus() {
  return useQuery({
    queryKey: queryKeys.syncStatus(),
    queryFn: () => syncApi.getSyncStatus(),
    // Poll so the "last sync" indicator and running-state stay fresh.
    refetchInterval: 30_000,
  });
}

export function useRunSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncApi.runSync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.syncStatus() });
    },
  });
}
