import { apiFetch } from "./client";
import { userAuthHeaders } from "./users";
import type { SavedSearch, SavedSearchCreate, SavedSearchList, SavedSearchUpdate } from "@/types";
import type { Offer } from "@/types";

/** Alerty ofertowe (Saved Searches) - dostępne dla każdego zalogowanego
 * użytkownika serwisu, patrz `backend/routers/saved_searches.py`. */

export function getMySavedSearches(): Promise<SavedSearchList> {
  return apiFetch<SavedSearchList>("/api/saved-searches", { headers: userAuthHeaders() });
}

export function getSavedSearch(id: number): Promise<SavedSearch> {
  return apiFetch<SavedSearch>(`/api/saved-searches/${id}`, { headers: userAuthHeaders() });
}

export function createSavedSearch(payload: SavedSearchCreate): Promise<SavedSearch> {
  return apiFetch<SavedSearch>("/api/saved-searches", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: userAuthHeaders(),
  });
}

export function updateSavedSearch(id: number, payload: SavedSearchUpdate): Promise<SavedSearch> {
  return apiFetch<SavedSearch>(`/api/saved-searches/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: userAuthHeaders(),
  });
}

export function deleteSavedSearch(id: number): Promise<void> {
  return apiFetch<void>(`/api/saved-searches/${id}`, {
    method: "DELETE",
    headers: userAuthHeaders(),
  });
}

export function enableSavedSearch(id: number): Promise<SavedSearch> {
  return apiFetch<SavedSearch>(`/api/saved-searches/${id}/enable`, {
    method: "POST",
    headers: userAuthHeaders(),
  });
}

export function disableSavedSearch(id: number): Promise<SavedSearch> {
  return apiFetch<SavedSearch>(`/api/saved-searches/${id}/disable`, {
    method: "POST",
    headers: userAuthHeaders(),
  });
}

export function getSavedSearchMatches(id: number): Promise<Offer[]> {
  return apiFetch<Offer[]>(`/api/saved-searches/${id}/matches`, { headers: userAuthHeaders() });
}
