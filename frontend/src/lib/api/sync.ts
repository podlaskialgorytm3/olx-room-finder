import { apiFetch } from "./client";
import type { SyncStatus, SyncTrigger } from "@/types";

export function getSyncStatus(): Promise<SyncStatus> {
  return apiFetch<SyncStatus>("/api/sync/status");
}

/**
 * Triggers a manual sync run.
 * Resolves with `{status: "started"}` (HTTP 202) or throws an `ApiError`
 * with `status === 409` if a sync is already running.
 */
export function runSync(): Promise<SyncTrigger> {
  return apiFetch<SyncTrigger>("/api/sync/run", { method: "POST" });
}

export function getHealth(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>("/api/health");
}
