import { apiFetch, buildQueryString } from "./client";
import { userAuthHeaders } from "./users";
import type { FavoriteList, FavoriteStatus } from "@/types";

/** Ulubione pokoje - dostępne tylko dla zalogowanego najemcy (`role='tenant'`),
 * patrz `backend/routers/favorites.py` / `backend/dependencies.py::require_tenant`. */

export function getMyFavorites(page = 1, limit = 20): Promise<FavoriteList> {
  const qs = buildQueryString({ page, limit });
  return apiFetch<FavoriteList>(`/api/favorites${qs}`, { headers: userAuthHeaders() });
}

/** Id wszystkich ofert polubionych przez zalogowanego najemcę - używane do
 * oznaczenia serduszkiem odpowiednich kart na liście ofert. */
export function getMyFavoriteIds(): Promise<string[]> {
  return apiFetch<string[]>("/api/favorites/ids", { headers: userAuthHeaders() });
}

export function getFavoriteStatus(offerId: string): Promise<FavoriteStatus> {
  return apiFetch<FavoriteStatus>(`/api/favorites/${encodeURIComponent(offerId)}`, {
    headers: userAuthHeaders(),
  });
}

export function addFavorite(offerId: string): Promise<FavoriteStatus> {
  return apiFetch<FavoriteStatus>(`/api/favorites/${encodeURIComponent(offerId)}`, {
    method: "POST",
    headers: userAuthHeaders(),
  });
}

export function removeFavorite(offerId: string): Promise<FavoriteStatus> {
  return apiFetch<FavoriteStatus>(`/api/favorites/${encodeURIComponent(offerId)}`, {
    method: "DELETE",
    headers: userAuthHeaders(),
  });
}
