import type { LoginRequest, SessionUser } from "@smt/shared/api-types";
import { api } from "@/lib/api";

export function login(request: LoginRequest): Promise<SessionUser> {
  return api<SessionUser>("/api/login", { method: "POST", body: JSON.stringify(request) });
}

export function getMe(): Promise<SessionUser> {
  return api<SessionUser>("/api/me");
}
