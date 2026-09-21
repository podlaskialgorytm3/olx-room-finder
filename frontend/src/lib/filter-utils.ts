import type { OfferFilters } from "@/types";

export function countActiveFilters(filters: OfferFilters): number {
  return Object.entries(filters).filter(([key, value]) => {
    if (key === "district") return false; // shown separately, not counted as "extra"
    return value !== undefined && value !== null && value !== "";
  }).length;
}

export const EMPTY_FILTERS: OfferFilters = {};
