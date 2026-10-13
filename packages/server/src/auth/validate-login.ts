import type { LoginRequest } from "@smt/shared/api-types";
import { AUTH_MESSAGES } from "./auth.constants";

export type LoginValidation = { ok: true; value: LoginRequest } | { ok: false; errors: Record<string, string> };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateLogin(body: unknown): LoginValidation {
  const fields = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const email = typeof fields.email === "string" ? normalizeEmail(fields.email) : "";
  const password = typeof fields.password === "string" ? fields.password : "";

  const errors: Record<string, string> = {};
  if (!email) errors.email = AUTH_MESSAGES.required;
  if (!password) errors.password = AUTH_MESSAGES.required;

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: { email, password } };
}
