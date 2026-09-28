"use client";

/**
 * Globalny store wybranej kategorii ogłoszeń (pokoje / mieszkania).
 * Analogicznie do `city-store.ts` - przełącznik na górze strony filtruje
 * cały serwis (stronę główną, listę ofert, statystyki, analizy).
 * Persystowany w localStorage (zustand `persist`), żeby odświeżenie strony
 * nie resetowało wyboru użytkownika. Domyślnie "room" (pokoje).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OfferCategory = "room" | "apartment";

export const DEFAULT_CATEGORY: OfferCategory = "room";

export const CATEGORY_LABELS: Record<OfferCategory, string> = {
  room: "Pokoje",
  apartment: "Mieszkania",
};

interface CategoryState {
  category: OfferCategory;
  setCategory: (category: OfferCategory) => void;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set) => ({
      category: DEFAULT_CATEGORY,
      setCategory: (category) => set({ category }),
    }),
    { name: "orf-selected-category" },
  ),
);

/** Currently selected offer category ("room" | "apartment"), for use in hooks/components. */
export function useSelectedCategory(): OfferCategory {
  return useCategoryStore((state) => state.category);
}
