import type { ApiErrorBody } from "@smt/shared/api-types";

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
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
    throw new ApiError(0, "network", "Can't reach the server. Check your connection.");
  });
  if (!res.ok) {
    // A proxy or crash page may not be JSON at all; that still has to surface as an ApiError.
    const body: unknown = await res.json().catch(() => null);
    if (isApiErrorBody(body)) {
      const { code, message, details } = body.error;
      throw new ApiError(res.status, code, message, details);
    }
    throw new ApiError(res.status, "unknown", GENERIC_MESSAGE);
  }
  return (await res.json()) as T;
}
