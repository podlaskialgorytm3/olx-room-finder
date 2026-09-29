"use client";

/**
 * Centrum powiadomień - historia NEW_OFFER/PRICE_DROP dla zalogowanego
 * użytkownika (dzwonek w navbarze + strona `/alerts`). Patrz
 * `backend/routers/notifications.py`.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useUserAuthStore } from "@/lib/user-auth-store";

function useIsLoggedIn(): boolean {
  return !!useUserAuthStore((state) => state.token);
}

/** Odpytuje co minutę, żeby licznik nieprzeczytanych w navbarze aktualizował
 * się mniej więcej na bieżąco (np. po synchronizacji OLX w tle). */
export function useNotifications(options: { unreadOnly?: boolean; page?: number; limit?: number } = {}) {
  const enabled = useIsLoggedIn();
  const unreadOnly = options.unreadOnly ?? false;
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  return useQuery({
    queryKey: queryKeys.notifications(unreadOnly, page, limit),
    queryFn: () => notificationsApi.getMyNotifications({ unreadOnly, page, limit }),
    enabled,
    refetchInterval: enabled ? 60_000 : false,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationsApi.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
