import { API_ROUTES } from "@smt/shared/api-routes";
import type { LoginRequest, SessionUser } from "@smt/shared/api-types";
import { api } from "@/lib/api";

export function login(request: LoginRequest): Promise<SessionUser> {
  return api<SessionUser>(API_ROUTES.login, { method: "POST", body: JSON.stringify(request) });
}

export function getMe(): Promise<SessionUser> {
  return api<SessionUser>(API_ROUTES.me);
}

export function logout(): Promise<void> {
  return api<undefined>(API_ROUTES.logout, { method: "POST" });
}
