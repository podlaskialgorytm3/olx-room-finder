import { apiFetch, buildQueryString } from "./client";
import { userAuthHeaders } from "./users";
import type { AppNotification, MarkAllReadResult, NotificationList } from "@/types";

/** Centrum powiadomień - historia NEW_OFFER/PRICE_DROP dla zalogowanego
 * użytkownika, patrz `backend/routers/notifications.py`. */

export function getMyNotifications(
  options: { unreadOnly?: boolean; page?: number; limit?: number } = {},
): Promise<NotificationList> {
  const qs = buildQueryString({
    unread_only: options.unreadOnly,
    page: options.page,
    limit: options.limit,
  });
  return apiFetch<NotificationList>(`/api/notifications${qs}`, { headers: userAuthHeaders() });
}

export function markNotificationRead(id: number): Promise<AppNotification> {
  return apiFetch<AppNotification>(`/api/notifications/${id}/read`, {
    method: "POST",
    headers: userAuthHeaders(),
  });
}

export function markAllNotificationsRead(): Promise<MarkAllReadResult> {
  return apiFetch<MarkAllReadResult>("/api/notifications/read-all", {
    method: "POST",
    headers: userAuthHeaders(),
  });
}
