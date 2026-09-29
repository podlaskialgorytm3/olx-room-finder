/**
 * Types mirroring `backend/schemas/route.py` - funkcja "Sprawdź dojazd" na
 * stronie szczegółów oferty (`POST /api/offers/{offer_id}/route`).
 */

export interface RouteRequest {
  destination: string;
}

export interface RouteResult {
  duration_min: number;
  distance_km: number;
  destination_label: string | null;
}
