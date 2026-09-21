import type { OffersQuery, SortField, SortOrder } from "@/types";

const BOOL_KEYS = ["negotiable", "hasAdditionalCost", "hasDeposit", "hasDepositCost"] as const;
const NUM_KEYS = ["minPrice", "maxPrice", "minTotalMonthlyCost", "maxTotalMonthlyCost", "page", "limit"] as const;

/** Parses a Next.js `URLSearchParams`-like record into a typed `OffersQuery`. */
export function parseOffersQuery(params: URLSearchParams): OffersQuery {
  const query: OffersQuery = {};

  const district = params.get("district");
  if (district) query.district = district;

  const search = params.get("search");
  if (search) query.search = search;

  for (const key of NUM_KEYS) {
    const raw = params.get(key);
    if (raw !== null && raw !== "") {
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) (query as Record<string, number>)[key] = parsed;
    }
  }

  for (const key of BOOL_KEYS) {
    const raw = params.get(key);
    if (raw === "true") (query as Record<string, boolean>)[key] = true;
    else if (raw === "false") (query as Record<string, boolean>)[key] = false;
  }

  const sort = params.get("sort");
  if (sort) query.sort = sort as SortField;

  const order = params.get("order");
  if (order) query.order = order as SortOrder;

  return query;
}

/** Serializes an `OffersQuery` back into a plain query-string record for `URLSearchParams`. */
export function offersQueryToParams(query: OffersQuery): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params[key] = String(value);
  }
  return params;
}
