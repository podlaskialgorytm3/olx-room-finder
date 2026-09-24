"use client";

/**
 * Global store for a logged-in service user's (tenant/landlord) session
 * token. Persisted to localStorage (via zustand's `persist` middleware) so
 * a page refresh doesn't log the user out. Independent from
 * `admin-auth-store` - these are two separate login systems (see
 * `backend/routers/users.py` vs `backend/routers/auth.py`).
 */

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface UserAuthState {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  clearSession: () => void;
}

export const useUserAuthStore = create<UserAuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
    }),
    { name: "olx-user-auth" },
  ),
);

/** Reads the current user token outside of React (e.g. from `lib/api`). */
export function getUserToken(): string | null {
  return useUserAuthStore.getState().token;
}

/**
 * True once the persisted store has been rehydrated from localStorage on
 * the client. Use this before trusting `token`/`user` to avoid a
 * server/client render mismatch (server never has localStorage).
 */
export function useUserAuthHydrated(): boolean {
  return useSyncExternalStore(
    (callback) => useUserAuthStore.persist.onFinishHydration(callback),
    () => useUserAuthStore.persist.hasHydrated(),
    () => false,
  );
}
