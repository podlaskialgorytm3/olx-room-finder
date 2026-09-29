/** Types mirroring `backend/schemas/notification.py`. */

import type { Pagination } from "./offer";

export type NotificationType = "NEW_OFFER" | "PRICE_DROP" | "OFFER_REMOVED";

export interface AppNotification {
  id: number;
  user_id: number;
  saved_search_id: number | null;
  offer_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string | null;
}

export interface NotificationList {
  data: AppNotification[];
  pagination: Pagination;
  unread_count: number;
}

export interface MarkAllReadResult {
  marked_count: number;
}
