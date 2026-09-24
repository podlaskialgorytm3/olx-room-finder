/** Types mirroring `backend/schemas/users.py`. */

export type UserRole = "tenant" | "landlord";
export type UserStatus = "pending" | "approved" | "rejected";

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

/** Publiczny formularz rejestracji. */
export interface UserRegister {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: UserRole;
}

export interface UserRegisterResult {
  user: User;
  message: string;
}

export interface UserPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface UserList {
  data: User[];
  pagination: UserPagination;
}

export interface UserQuery {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

/** Ręczne utworzenie konta przez administratora. */
export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
}

/** Częściowa aktualizacja konta przez administratora. */
export interface UserUpdate {
  email?: string;
  full_name?: string;
  phone?: string;
  role?: UserRole;
  status?: UserStatus;
  password?: string;
}

export interface UserDelete {
  status: string;
  id: number;
}
