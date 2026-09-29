"use client";

/**
 * Alerty ofertowe (Saved Searches) - zapisane kryteria wyszukiwania, dla
 * których zalogowany użytkownik dostaje powiadomienie o nowych/tańszych
 * ofertach. Patrz `backend/routers/saved_searches.py`.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { savedSearchesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useUserAuthStore } from "@/lib/user-auth-store";
import type { SavedSearchCreate, SavedSearchUpdate } from "@/types";

function useIsLoggedIn(): boolean {
  return !!useUserAuthStore((state) => state.token);
}

export function useSavedSearches() {
  const enabled = useIsLoggedIn();
  return useQuery({
    queryKey: queryKeys.savedSearches(),
    queryFn: () => savedSearchesApi.getMySavedSearches(),
    enabled,
  });
}

export function useSavedSearchMatches(id: number, enabled = true) {
  const loggedIn = useIsLoggedIn();
  return useQuery({
    queryKey: queryKeys.savedSearchMatches(id),
    queryFn: () => savedSearchesApi.getSavedSearchMatches(id),
    enabled: enabled && loggedIn,
  });
}

function useInvalidateSavedSearches() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
}

export function useCreateSavedSearch() {
  const invalidate = useInvalidateSavedSearches();
  return useMutation({
    mutationFn: (payload: SavedSearchCreate) => savedSearchesApi.createSavedSearch(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateSavedSearch() {
  const invalidate = useInvalidateSavedSearches();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SavedSearchUpdate }) =>
      savedSearchesApi.updateSavedSearch(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteSavedSearch() {
  const invalidate = useInvalidateSavedSearches();
  return useMutation({
    mutationFn: (id: number) => savedSearchesApi.deleteSavedSearch(id),
    onSuccess: invalidate,
  });
}

export function useToggleSavedSearch() {
  const invalidate = useInvalidateSavedSearches();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      enabled ? savedSearchesApi.disableSavedSearch(id) : savedSearchesApi.enableSavedSearch(id),
    onSuccess: invalidate,
  });
}
