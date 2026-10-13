// The API contract. Server and web meet only through these types.

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string> };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SessionUser {
  email: string;
}
