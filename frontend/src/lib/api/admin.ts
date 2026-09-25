import { apiFetch, buildQueryString } from "./client";
import { authHeaders } from "./auth";
import { filtersToQuery } from "./offers";
import type {
  CityConfig,
  CityConfigCreate,
  CityConfigUpdate,
  CityDelete,
  CitySyncCancel,
  CitySyncTrigger,
  OfferAdminList,
  OfferDelete,
  OfferDetail,
  OffersQuery,
  OfferUpdate,
} from "@/types";

export function getCities(): Promise<CityConfig[]> {
  return apiFetch<CityConfig[]>("/api/admin/cities", { headers: authHeaders() });
}

export function createCity(payload: CityConfigCreate): Promise<CityConfig> {
  return apiFetch<CityConfig>("/api/admin/cities", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(),
  });
}

export function updateCitySyncHour(city: string, payload: CityConfigUpdate): Promise<CityConfig> {
  return apiFetch<CityConfig>(`/api/admin/cities/${city}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: authHeaders(),
  });
}

export function deleteCity(city: string): Promise<CityDelete> {
  return apiFetch<CityDelete>(`/api/admin/cities/${city}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export function triggerCitySync(city: string): Promise<CitySyncTrigger> {
  return apiFetch<CitySyncTrigger>(`/api/admin/cities/${city}/sync`, {
    method: "POST",
    headers: authHeaders(),
  });
}

export function cancelCitySync(city: string): Promise<CitySyncCancel> {
  return apiFetch<CitySyncCancel>(`/api/admin/cities/${city}/sync/cancel`, {
    method: "POST",
    headers: authHeaders(),
  });
}

// --- Zarządzanie pokojami (CRUD na ofertach) --------------------------------

export function getAdminOffers(query: OffersQuery = {}): Promise<OfferAdminList> {
  const qs = buildQueryString({
    ...filtersToQuery(query),
    status: query.status,
    sort: query.sort,
    order: query.order,
    page: query.page,
    limit: query.limit,
  });
  return apiFetch<OfferAdminList>(`/api/admin/offers${qs}`, { headers: authHeaders() });
}

export function getAdminOffer(id: string): Promise<OfferDetail> {
  return apiFetch<OfferDetail>(`/api/admin/offers/${encodeURIComponent(id)}`, { headers: authHeaders() });
}

export function getAdminOfferDistricts(city?: string): Promise<string[]> {
  const qs = buildQueryString({ city });
  return apiFetch<string[]>(`/api/admin/offers/districts${qs}`, { headers: authHeaders() });
}

export function updateOffer(id: string, payload: OfferUpdate): Promise<OfferDetail> {
  return apiFetch<OfferDetail>(`/api/admin/offers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: authHeaders(),
  });
}

export function deleteOffer(id: string): Promise<OfferDelete> {
  return apiFetch<OfferDelete>(`/api/admin/offers/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}
