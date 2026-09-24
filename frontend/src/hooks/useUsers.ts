"use client";

import { useMutation } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { useUserAuthStore } from "@/lib/user-auth-store";
import type { UserLogin, UserRegister } from "@/types";

/** Publiczna rejestracja konta (formularz `/register`). */
export function useRegisterUser() {
  return useMutation({
    mutationFn: (payload: UserRegister) => usersApi.register(payload),
  });
}

/** Logowanie zwykłego użytkownika serwisu (formularz `/login`). */
export function useUserLogin() {
  const setSession = useUserAuthStore((state) => state.setSession);
  return useMutation({
    mutationFn: (payload: UserLogin) => usersApi.login(payload),
    onSuccess: (data) => setSession(data.token, data.user),
  });
}

export function useUserLogout() {
  const clearSession = useUserAuthStore((state) => state.clearSession);
  return useMutation({
    mutationFn: () => usersApi.logout(),
    onSettled: () => clearSession(),
  });
}
