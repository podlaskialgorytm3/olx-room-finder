/** Types mirroring `backend/schemas/admin.py`. */

import type { SyncRun } from "./sync";
import type { OfferDetail, Pagination } from "./offer";

export type OfferCategoryKey = "room" | "apartment";

export interface CityCategoryConfig {
  link: string | null;
  sync_hour: number;
  sync_minute: number;
  offers_count: number;
  running: boolean;
  cancelling: boolean;
  last_run: SyncRun | null;
}

export interface CityConfig {
  city: string;
  display_name: string;
  rooms: CityCategoryConfig;
  apartments: CityCategoryConfig;
}

export interface CityConfigCreate {
  city: string;
  display_name: string;
  link: string;
  sync_hour?: number;
  sync_minute?: number;
}

export interface CityConfigUpdate {
  category?: OfferCategoryKey;
  sync_hour: number;
  sync_minute: number;
  display_name?: string;
  link?: string;
}

export interface CitySyncTrigger {
  status: string;
  city: string;
}

export interface CitySyncCancel {
  status: string;
  city: string;
}

export interface CityDelete {
  status: string;
  city: string;
}

/** Admin (authenticated) list of offers - identical shape to `OfferList` but
 * kept separate to mirror `backend/schemas/admin.py::OfferAdminListOut`. */
export interface OfferAdminList {
  data: OfferDetail[];
  pagination: Pagination;
}

export interface OfferDelete {
  status: string;
  id: string;
}
