import { apiFetch, buildQueryString } from "./client";
import type { OfferDetail, OfferFilters, OfferList, OffersQuery } from "@/types";

function filtersToQuery(filters: OfferFilters): Record<string, unknown> {
  return {
    district: filters.district,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minTotalMonthlyCost: filters.minTotalMonthlyCost,
    maxTotalMonthlyCost: filters.maxTotalMonthlyCost,
    negotiable: filters.negotiable,
    hasAdditionalCost: filters.hasAdditionalCost,
    hasDeposit: filters.hasDeposit,
    hasDepositCost: filters.hasDepositCost,
    search: filters.search,
  };
}

export function getOffers(query: OffersQuery = {}): Promise<OfferList> {
  const qs = buildQueryString({
    ...filtersToQuery(query),
    sort: query.sort,
    order: query.order,
    page: query.page,
    limit: query.limit,
  });
  return apiFetch<OfferList>(`/api/offers${qs}`);
}

export function getOffer(id: string): Promise<OfferDetail> {
  return apiFetch<OfferDetail>(`/api/offers/${encodeURIComponent(id)}`);
}

export { filtersToQuery };
