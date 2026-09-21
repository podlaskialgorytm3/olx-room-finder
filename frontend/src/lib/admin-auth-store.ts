"use client";

/**
 * Global store for the admin panel's session token. Persisted to
 * localStorage (via zustand's `persist` middleware) so a page refresh
 * doesn't log the admin out. Never used for anything outside `/admin/*`.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AdminAuthState {
  token: string | null;
  username: string | null;
  setSession: (token: string, username: string) => void;
  clearSession: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      token: null,
      username: null,
      setSession: (token, username) => set({ token, username }),
      clearSession: () => set({ token: null, username: null }),
    }),
    { name: "olx-admin-auth" },
  ),
);

/** Reads the current admin token outside of React (e.g. from `lib/api`). */
export function getAdminToken(): string | null {
  return useAdminAuthStore.getState().token;
}
