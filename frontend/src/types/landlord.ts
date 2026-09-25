/** Types mirroring `backend/schemas/landlord.py`. */

import type { OfferDetail, Pagination } from "./offer";

/** Formularz dodania nowego ogłoszenia - zdjęcia jako lista linków (URL). */
export interface LandlordOfferCreate {
  title: string;
  city: string;
  district?: string | null;
  price: number;
  negotiable?: boolean | null;
  description?: string | null;
  address?: string | null;
  additional_cost?: number | null;
  has_additional_cost?: boolean | null;
  deposit?: number | null;
  has_deposit?: boolean | null;
  has_deposit_cost?: boolean | null;
  total_monthly_cost?: number | null;
  link?: string | null;
  photos?: string[];
}

/** Częściowa edycja własnego ogłoszenia - każda edycja resetuje status do "pending". */
export interface LandlordOfferUpdate {
  title?: string;
  city?: string;
  district?: string | null;
  price?: number;
  negotiable?: boolean | null;
  description?: string | null;
  address?: string | null;
  additional_cost?: number | null;
  has_additional_cost?: boolean | null;
  deposit?: number | null;
  has_deposit?: boolean | null;
  has_deposit_cost?: boolean | null;
  total_monthly_cost?: number | null;
  link?: string | null;
  photos?: string[];
}

export interface LandlordOfferList {
  data: OfferDetail[];
  pagination: Pagination;
}

export interface LandlordOfferDelete {
  status: string;
  id: string;
}
