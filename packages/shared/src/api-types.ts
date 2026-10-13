// The API contract. Server and web meet only through these types.

import type { ErrorCode } from "./error-codes";

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: Record<string, string> };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SessionUser {
  email: string;
}
