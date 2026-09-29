import { apiFetch } from "./client";
import type { RouteResult } from "@/types";

/**
 * Liczy on-demand (nigdy podczas synchronizacji OLX) czas dojazdu
 * komunikacją publiczną i odległość z lokalizacji oferty do podanego przez
 * użytkownika miejsca docelowego - patrz `backend/routers/offers.py`
 * (`POST /api/offers/{offer_id}/route`) i `backend/services/routing_service.py`.
 */
export function checkOfferRoute(offerId: string, destination: string): Promise<RouteResult> {
  return apiFetch<RouteResult>(`/api/offers/${encodeURIComponent(offerId)}/route`, {
    method: "POST",
    body: JSON.stringify({ destination }),
  });
}
