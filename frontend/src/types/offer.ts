/**
 * Types mirroring `backend/schemas/offer.py`.
 *
 * IMPORTANT: `has_additional_cost`, `has_deposit`, `has_deposit_cost` and
 * `negotiable` are tri-state (`true | false | null`). `null` means "unknown",
 * NOT "false". Never coerce `null` to `false` in the UI.
 */
export interface Offer {
  id: string;
  title: string;
  city: string;
  district: string | null;
  price: number | null;
  negotiable: boolean | null;
  link: string | null;
  address: string | null;
  additional_cost: number | null;
  has_additional_cost: boolean | null;
  deposit: number | null;
  has_deposit_cost: boolean | null;
  has_deposit: boolean | null;
  total_monthly_cost: number | null;
  photos: string[];
}

export interface OfferDetail extends Offer {
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface OfferList {
  data: Offer[];
  pagination: Pagination;
}

export type SortField = "price" | "total_monthly_cost" | "additional_cost" | "deposit" | "created_at";
export type SortOrder = "asc" | "desc";

/** Query params accepted by GET /api/offers (and shared by /statistics, /analysis). */
export interface OfferFilters {
  city?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  minTotalMonthlyCost?: number;
  maxTotalMonthlyCost?: number;
  negotiable?: boolean;
  hasAdditionalCost?: boolean;
  hasDeposit?: boolean;
  hasDepositCost?: boolean;
  search?: string;
}

export interface OffersQuery extends OfferFilters {
  sort?: SortField;
  order?: SortOrder;
  page?: number;
  limit?: number;
}
