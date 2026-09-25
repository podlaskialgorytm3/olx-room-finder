import { apiFetch, buildQueryString } from "./client";
import { userAuthHeaders } from "./users";
import type {
  LandlordOfferCreate,
  LandlordOfferDelete,
  LandlordOfferList,
  LandlordOfferUpdate,
  OfferDetail,
} from "@/types";

/** Panel wynajmującego - zarządzanie własnymi ogłoszeniami. Każde
 * utworzone/edytowane ogłoszenie trafia ze statusem `pending` i wymaga
 * zatwierdzenia przez administratora, zanim pojawi się w publicznym
 * `/api/offers` (patrz `backend/routers/landlord.py`). */

export function getMyOffers(page = 1, limit = 20): Promise<LandlordOfferList> {
  const qs = buildQueryString({ page, limit });
  return apiFetch<LandlordOfferList>(`/api/landlord/offers${qs}`, { headers: userAuthHeaders() });
}

export function getMyOffer(id: string): Promise<OfferDetail> {
  return apiFetch<OfferDetail>(`/api/landlord/offers/${encodeURIComponent(id)}`, { headers: userAuthHeaders() });
}

export function createMyOffer(payload: LandlordOfferCreate): Promise<OfferDetail> {
  return apiFetch<OfferDetail>("/api/landlord/offers", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: userAuthHeaders(),
  });
}

export function updateMyOffer(id: string, payload: LandlordOfferUpdate): Promise<OfferDetail> {
  return apiFetch<OfferDetail>(`/api/landlord/offers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: userAuthHeaders(),
  });
}

export function deleteMyOffer(id: string): Promise<LandlordOfferDelete> {
  return apiFetch<LandlordOfferDelete>(`/api/landlord/offers/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: userAuthHeaders(),
  });
}
