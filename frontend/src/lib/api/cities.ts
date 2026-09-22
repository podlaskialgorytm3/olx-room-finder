import { apiFetch } from "./client";
import type { PublicCity } from "@/types";

/** Public (unauthenticated) list of cities available for browsing offers. */
export function getPublicCities(): Promise<PublicCity[]> {
  return apiFetch<PublicCity[]>("/api/cities");
}
