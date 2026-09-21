import { apiFetch } from "./client";
import { authHeaders } from "./auth";
import type { CityConfig, CityConfigUpdate, CitySyncTrigger } from "@/types";

export function getCities(): Promise<CityConfig[]> {
  return apiFetch<CityConfig[]>("/api/admin/cities", { headers: authHeaders() });
}

export function updateCitySyncHour(city: string, payload: CityConfigUpdate): Promise<CityConfig> {
  return apiFetch<CityConfig>(`/api/admin/cities/${city}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: authHeaders(),
  });
}

export function triggerCitySync(city: string): Promise<CitySyncTrigger> {
  return apiFetch<CitySyncTrigger>(`/api/admin/cities/${city}/sync`, {
    method: "POST",
    headers: authHeaders(),
  });
}
