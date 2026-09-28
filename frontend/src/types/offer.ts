/**
 * Types mirroring `backend/schemas/offer.py`.
 *
 * IMPORTANT: `has_additional_cost`, `has_deposit`, `has_deposit_cost` and
 * `negotiable` are tri-state (`true | false | null`). `null` means "unknown",
 * NOT "false". Never coerce `null` to `false` in the UI.
 */
export type OfferStatus = "pending" | "approved" | "rejected";
export type OfferSource = "olx" | "landlord";
export type OfferCategory = "room" | "apartment";

export interface Offer {
  id: string;
  title: string;
  city: string;
  category: OfferCategory;
  district: string | null;
  price: number | null;
  area_m2: number | null;
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
  views_count: number;
  status: OfferStatus;
  source: OfferSource;
}

export interface OfferDetail extends Offer {
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  owner_user_id: number | null;
  rejection_reason: string | null;
  /** Łączna liczba polubień - widoczna w panelu administratora
   * ("Zarządzanie pokojami") i na stronie szczegółów ogłoszenia. */
  favorites_count: number;
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

export type SortField = "price" | "total_monthly_cost" | "additional_cost" | "deposit" | "created_at" | "views_count";
export type SortOrder = "asc" | "desc";

/** Query params accepted by GET /api/offers (and shared by /statistics, /analysis). */
export interface OfferFilters {
  city?: string;
  category?: OfferCategory;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  minAreaM2?: number;
  maxAreaM2?: number;
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
  /** Tylko panel administratora ("Zarządzanie pokojami") - filtr statusu
   * moderacji ogłoszeń wynajmujących. Ignorowane przez publiczny /api/offers. */
  status?: OfferStatus;
}

/** Partial update payload for PATCH /api/admin/offers/{id} - mirrors
 * `backend/schemas/admin.py::OfferUpdateIn`. Every field is optional so the
 * admin panel can send only the fields that were actually edited. */
export interface OfferUpdate {
  title?: string;
  city?: string;
  category?: OfferCategory;
  district?: string | null;
  price?: number | null;
  area_m2?: number | null;
  negotiable?: boolean | null;
  link?: string | null;
  description?: string | null;
  address?: string | null;
  additional_cost?: number | null;
  has_additional_cost?: boolean | null;
  deposit?: number | null;
  has_deposit_cost?: boolean | null;
  has_deposit?: boolean | null;
  total_monthly_cost?: number | null;
  photos?: string[];
  status?: OfferStatus;
  rejection_reason?: string | null;
}
