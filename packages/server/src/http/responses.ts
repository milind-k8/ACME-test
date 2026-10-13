import type { ApiErrorBody } from "@smt/shared/api-types";
import { ERROR_CODES, type ErrorCode } from "@smt/shared/error-codes";
import { HTTP_MESSAGES } from "./http.constants";

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function error(status: number, code: ErrorCode, message: string, details?: Record<string, string>): Response {
  const body: ApiErrorBody = { error: details ? { code, message, details } : { code, message } };
  return Response.json(body, { status });
}

export function notFound(): Response {
  return error(404, ERROR_CODES.notFound, HTTP_MESSAGES.notFound);
}

// The details stay in the server log; the client never sees messages, stacks, or SQL.
export function unexpected(err: unknown): Response {
  console.error(err);
  return error(500, ERROR_CODES.internal, HTTP_MESSAGES.internal);
}
