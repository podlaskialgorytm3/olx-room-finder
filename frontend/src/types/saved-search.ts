/** Types mirroring `backend/schemas/saved_search.py`. */

export interface SavedSearch {
  id: number;
  user_id: number;
  name: string;
  city_id: string | null;
  category: "room" | "apartment" | null;
  districts: string[];
  min_price: number | null;
  max_price: number | null;
  min_area: number | null;
  max_area: number | null;
  source: "olx" | "landlord" | null;
  notification_enabled: boolean;
  notify_new_offers: boolean;
  notify_price_drops: boolean;
  created_at: string | null;
  updated_at: string | null;
  last_checked_at: string | null;
  /** Liczba ofert aktualnie spełniających kryteria alertu. */
  matches_count: number;
  /** Liczba powiadomień (NEW_OFFER/PRICE_DROP) wygenerowanych dotąd przez ten alert. */
  new_notifications_count: number;
}

export interface SavedSearchList {
  data: SavedSearch[];
}

/** Ciało żądania tworzącego alert - przepisywane z aktualnie ustawionych filtrów na `/offers`. */
export interface SavedSearchCreate {
  name: string;
  city_id?: string | null;
  category?: "room" | "apartment" | null;
  districts?: string[];
  min_price?: number | null;
  max_price?: number | null;
  min_area?: number | null;
  max_area?: number | null;
  source?: "olx" | "landlord" | null;
  notification_enabled?: boolean;
  notify_new_offers?: boolean;
  notify_price_drops?: boolean;
}

export type SavedSearchUpdate = Partial<SavedSearchCreate>;
