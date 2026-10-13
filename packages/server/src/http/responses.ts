import type { ApiErrorBody } from "@smt/shared/api-types";

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function error(status: number, code: string, message: string, details?: Record<string, string>): Response {
  const body: ApiErrorBody = { error: details ? { code, message, details } : { code, message } };
  return Response.json(body, { status });
}

export function notFound(): Response {
  return error(404, "not_found", "Not found");
}

// The details stay in the server log; the client never sees messages, stacks, or SQL.
export function unexpected(err: unknown): Response {
  console.error(err);
  return error(500, "internal", "Something went wrong");
}
