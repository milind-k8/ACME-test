import { API_ROUTES } from "@smt/shared/api-routes";
import type { ApiErrorBody } from "@smt/shared/api-types";
import type { ErrorCode } from "@smt/shared/error-codes";
import { API_MESSAGES, CLIENT_ERROR_CODES, type ClientErrorCode } from "./api.constants";

const unauthorizedListeners = new Set<() => void>();

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | ClientErrorCode,
    message: string,
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  if (typeof body !== "object" || body === null || !("error" in body)) return false;
  const { error } = body;
  return typeof error === "object" && error !== null && "code" in error && "message" in error;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const request: RequestInit = {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
  };
  const res = await fetch(path, request).catch(() => {
    throw new ApiError(0, CLIENT_ERROR_CODES.network, API_MESSAGES.network);
  });
  if (!res.ok) {
    // A 401 anywhere except the login call itself means the session is gone (expired or logged out elsewhere).
    if (res.status === 401 && path !== API_ROUTES.login) {
      unauthorizedListeners.forEach((listener) => {
        listener();
      });
    }
    // A proxy or crash page may not be JSON at all; that still has to surface as an ApiError.
    const body: unknown = await res.json().catch(() => null);
    if (isApiErrorBody(body)) {
      const { code, message, details } = body.error;
      throw new ApiError(res.status, code, message, details);
    }
    throw new ApiError(res.status, CLIENT_ERROR_CODES.unknown, API_MESSAGES.unknown);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}
