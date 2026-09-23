/** Types mirroring `backend/schemas/admin.py`. */

import type { SyncRun } from "./sync";

export interface CityConfig {
  city: string;
  display_name: string;
  link: string | null;
  sync_hour: number;
  sync_minute: number;
  offers_count: number;
  running: boolean;
  cancelling: boolean;
  last_run: SyncRun | null;
}

export interface CityConfigCreate {
  city: string;
  display_name: string;
  link: string;
  sync_hour?: number;
  sync_minute?: number;
}

export interface CityConfigUpdate {
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
