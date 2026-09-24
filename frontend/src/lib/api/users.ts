import { apiFetch, buildQueryString } from "./client";
import { authHeaders } from "./auth";
import { getUserToken } from "@/lib/user-auth-store";
import type {
  User,
  UserCreate,
  UserDelete,
  UserList,
  UserLogin,
  UserLoginResult,
  UserQuery,
  UserRegister,
  UserRegisterResult,
  UserUpdate,
} from "@/types";

/** Publiczna rejestracja konta (najemca/wynajmujący) - nie wymaga tokenu. */
export function register(payload: UserRegister): Promise<UserRegisterResult> {
  return apiFetch<UserRegisterResult>("/api/users/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Logowanie zwykłego użytkownika serwisu (najemca/zatwierdzony wynajmujący). */
export function login(payload: UserLogin): Promise<UserLoginResult> {
  return apiFetch<UserLoginResult>("/api/users/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>("/api/users/logout", {
    method: "POST",
    headers: userAuthHeaders(),
  });
}

export function me(): Promise<User> {
  return apiFetch<User>("/api/users/me", { headers: userAuthHeaders() });
}

/** Builds the `Authorization` header for the logged-in service user (not the admin panel). */
export function userAuthHeaders(): Record<string, string> {
  const token = getUserToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Panel administratora - "Zarządzanie kontami" (pełny CRUD) -------------

export function getUsers(query: UserQuery = {}): Promise<UserList> {
  const qs = buildQueryString({
    role: query.role,
    status: query.status,
    search: query.search,
    page: query.page,
    limit: query.limit,
  });
  return apiFetch<UserList>(`/api/admin/users${qs}`, { headers: authHeaders() });
}

export function getUser(id: number): Promise<User> {
  return apiFetch<User>(`/api/admin/users/${id}`, { headers: authHeaders() });
}

export function createUser(payload: UserCreate): Promise<User> {
  return apiFetch<User>("/api/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: authHeaders(),
  });
}

export function updateUser(id: number, payload: UserUpdate): Promise<User> {
  return apiFetch<User>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: authHeaders(),
  });
}

export function deleteUser(id: number): Promise<UserDelete> {
  return apiFetch<UserDelete>(`/api/admin/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}
