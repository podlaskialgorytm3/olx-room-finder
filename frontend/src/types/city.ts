/** Types mirroring `backend/schemas/city.py` (public, unauthenticated city list). */

export interface PublicCity {
  city: string;
  display_name: string;
}
