"use client";

/**
 * Porównywarka ofert - wybór ofert do porównania (MVP, bez backendu i bez
 * logowania). Przechowywane lokalnie w przeglądarce (via zustand `persist`),
 * podobnie jak `user-auth-store`. Maksymalnie `MAX_COMPARE_ITEMS` ofert
 * naraz - przy próbie dodania kolejnej wywołujący kod dostaje `false` z
 * `toggle`/`add` i powinien poinformować użytkownika (np. toastem).
 */

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAX_COMPARE_ITEMS = 4;
export const MIN_COMPARE_ITEMS = 2;

interface CompareState {
  ids: string[];
  add: (id: string) => boolean;
  remove: (id: string) => void;
  toggle: (id: string) => boolean;
  clear: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (id) => {
        const { ids } = get();
        if (ids.includes(id)) return true;
        if (ids.length >= MAX_COMPARE_ITEMS) return false;
        set({ ids: [...ids, id] });
        return true;
      },
      remove: (id) => set((state) => ({ ids: state.ids.filter((existing) => existing !== id) })),
      toggle: (id) => {
        const { ids, add, remove } = get();
        if (ids.includes(id)) {
          remove(id);
          return true;
        }
        return add(id);
      },
      clear: () => set({ ids: [] }),
    }),
    { name: "olx-compare-offers" },
  ),
);

/** True dopiero po odtworzeniu stanu z localStorage na kliencie - używać
 * przed zaufaniem `ids`, żeby uniknąć różnic między renderem serwera i
 * klienta (patrz `useUserAuthHydrated`). */
export function useCompareHydrated(): boolean {
  return useSyncExternalStore(
    (callback) => useCompareStore.persist.onFinishHydration(callback),
    () => useCompareStore.persist.hasHydrated(),
    () => false,
  );
}
