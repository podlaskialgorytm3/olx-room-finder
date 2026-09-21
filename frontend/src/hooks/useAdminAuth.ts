"use client";

import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { useAdminAuthStore } from "@/lib/admin-auth-store";
import type { LoginRequest } from "@/types";

export function useAdminLogin() {
  const setSession = useAdminAuthStore((state) => state.setSession);
  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (data) => setSession(data.token, data.username),
  });
}

export function useAdminLogout() {
  const clearSession = useAdminAuthStore((state) => state.clearSession);
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => clearSession(),
  });
}
