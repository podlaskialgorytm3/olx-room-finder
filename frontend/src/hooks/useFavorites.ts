"use client";

/**
 * Ulubione pokoje najemcy - dodawanie/usuwanie ogłoszeń z ulubionych oraz
 * lista ulubionych id (do oznaczania serduszkiem kart na liście ofert).
 * Dostępne tylko dla zalogowanego konta z rolą `tenant` - patrz
 * `backend/routers/favorites.py` i `backend/dependencies.py::require_tenant`.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { favoritesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useUserAuthStore } from "@/lib/user-auth-store";

/** True tylko dla zalogowanego najemcy - wynajmujący i goście nie mają dostępu do ulubionych. */
function useIsTenantLoggedIn(): boolean {
  const token = useUserAuthStore((state) => state.token);
  const role = useUserAuthStore((state) => state.user?.role);
  return !!token && role === "tenant";
}

/** Lista id ulubionych ofert zalogowanego najemcy - używana przez karty ofert
 * do wyświetlenia wypełnionego/pustego serduszka bez zapytania per-karta. */
export function useFavoriteIds() {
  const enabled = useIsTenantLoggedIn();
  return useQuery({
    queryKey: queryKeys.favoriteIds(),
    queryFn: () => favoritesApi.getMyFavoriteIds(),
    enabled,
  });
}

/** Pełna lista ulubionych ofert (strona "Ulubione") - zwraca dane ogłoszeń. */
export function useFavorites(page = 1, limit = 20) {
  const enabled = useIsTenantLoggedIn();
  return useQuery({
    queryKey: queryKeys.favorites(page, limit),
    queryFn: () => favoritesApi.getMyFavorites(page, limit),
    enabled,
    placeholderData: (previousData) => previousData,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, isFavorite }: { offerId: string; isFavorite: boolean }) =>
      isFavorite ? favoritesApi.removeFavorite(offerId) : favoritesApi.addFavorite(offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
