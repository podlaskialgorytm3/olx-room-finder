"use client";

import { useMutation } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import type { UserRegister } from "@/types";

/** Publiczna rejestracja konta (formularz `/register`). */
export function useRegisterUser() {
  return useMutation({
    mutationFn: (payload: UserRegister) => usersApi.register(payload),
  });
}
