import { apiFetch } from "./client";
import { getAdminToken } from "@/lib/admin-auth-store";
import type { LoginRequest, LoginResponse, Me } from "@/types";

export function login(payload: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>("/api/auth/logout", {
    method: "POST",
    headers: authHeaders(),
  });
}

export function me(): Promise<Me> {
  return apiFetch<Me>("/api/auth/me", { headers: authHeaders() });
}

/** Builds the `Authorization: Bearer <token>` header for admin-only calls. */
export function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
