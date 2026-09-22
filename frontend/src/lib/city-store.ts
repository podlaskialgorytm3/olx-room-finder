"use client";

/**
 * Globalny store wybranego miasta (dla przełącznika miasta na stronie
 * głównej i listy ofert). Persystowany w localStorage (zustand `persist`),
 * żeby odświeżenie strony nie resetowało wyboru użytkownika. Domyślnie
 * "WARSZAWA" - jedyne miasto, dla którego dostępna jest interaktywna mapa
 * dzielnic.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const DEFAULT_CITY = "WARSZAWA";

interface CityState {
  city: string;
  setCity: (city: string) => void;
}

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      city: DEFAULT_CITY,
      setCity: (city) => set({ city }),
    }),
    { name: "orf-selected-city" },
  ),
);

/** Currently selected city code (e.g. "WARSZAWA"), for use in hooks/components. */
export function useSelectedCity(): string {
  return useCityStore((state) => state.city);
}
