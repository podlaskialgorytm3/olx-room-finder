import type { AnalysisMetric, OfferFilters, OffersQuery } from "@/types";

/** Centralized query key factory so cache invalidation stays consistent. */
export const queryKeys = {
  offers: (query: OffersQuery) => ["offers", query] as const,
  offer: (id: string) => ["offer", id] as const,
  statisticsOverview: (filters: OfferFilters) => ["statistics", "overview", filters] as const,
  statisticsPrice: (filters: OfferFilters) => ["statistics", "price", filters] as const,
  statisticsDistricts: (filters: OfferFilters) => ["statistics", "districts", filters] as const,
  statisticsDistrict: (name: string, filters: OfferFilters) =>
    ["statistics", "district", name, filters] as const,
  priceDistribution: (binSize: number | undefined, filters: OfferFilters) =>
    ["statistics", "price-distribution", binSize, filters] as const,
  deposits: (filters: OfferFilters) => ["statistics", "deposits", filters] as const,
  additionalCosts: (filters: OfferFilters) => ["statistics", "additional-costs", filters] as const,
  negotiation: (filters: OfferFilters) => ["statistics", "negotiation", filters] as const,
  priceVsDistrict: (filters: OfferFilters) => ["analysis", "price-vs-district", filters] as const,
  initialCost: (filters: OfferFilters) => ["analysis", "initial-cost", filters] as const,
  districtsComparison: (filters: OfferFilters) => ["analysis", "districts", filters] as const,
  outliers: (metric: AnalysisMetric, filters: OfferFilters) => ["analysis", "outliers", metric, filters] as const,
  costDistribution: (metric: AnalysisMetric, binSize: number | undefined, filters: OfferFilters) =>
    ["analysis", "cost-distribution", metric, binSize, filters] as const,
  valueScore: (filters: OfferFilters) => ["analysis", "value", filters] as const,
  adminCities: () => ["admin", "cities"] as const,
  adminOffers: (query: OffersQuery) => ["admin", "offers", query] as const,
  adminOffer: (id: string) => ["admin", "offer", id] as const,
  adminOfferDistricts: (city: string | undefined) => ["admin", "offer-districts", city] as const,
  publicCities: () => ["cities", "public"] as const,
};
