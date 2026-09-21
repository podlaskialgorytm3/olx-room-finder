/** Types mirroring `backend/schemas/sync.py`. */

export interface SyncRun {
  id: number;
  started_at: string;
  finished_at: string | null;
  offers_seen: number | null;
  offers_added: number | null;
  offers_removed: number | null;
  max_page: number | null;
}

export interface SyncStatus {
  running: boolean;
  offers_count: number;
  last_run: SyncRun | null;
}

export interface SyncTrigger {
  status: string;
}
