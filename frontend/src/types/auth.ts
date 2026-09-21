/** Types mirroring `backend/schemas/auth.py`. */

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  expires_at: string;
}

export interface Me {
  username: string;
}
