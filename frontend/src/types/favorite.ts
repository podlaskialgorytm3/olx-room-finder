/** Types mirroring `backend/schemas/favorite.py`. */

import type { OfferDetail, Pagination } from "./offer";

export interface FavoriteStatus {
  offer_id: string;
  is_favorite: boolean;
  favorites_count: number;
}

export interface FavoriteList {
  data: OfferDetail[];
  pagination: Pagination;
}
