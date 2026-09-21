/** Types mirroring `backend/schemas/admin.py`. */

import type { SyncRun } from "./sync";

export interface CityConfig {
  city: string;
  display_name: string;
  sync_hour: number;
  sync_minute: number;
  offers_count: number;
  running: boolean;
  last_run: SyncRun | null;
}

export interface CityConfigUpdate {
  sync_hour: number;
  sync_minute: number;
}

export interface CitySyncTrigger {
  status: string;
  city: string;
}
