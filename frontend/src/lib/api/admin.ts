import { apiFetch } from "./client";
import { authHeaders } from "./auth";
import type { CityConfig, CityConfigCreate, CityConfigUpdate, CityDelete, CitySyncTrigger } from "@/types";

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
