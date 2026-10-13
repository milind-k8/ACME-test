import { API_ROUTES } from "@smt/shared/api-routes";
import type { Dashboard } from "@smt/shared/api-types";
import { api } from "@/lib/api";

export function getDashboard(params = new URLSearchParams()): Promise<Dashboard> {
  const query = params.toString();
  return api<Dashboard>(query ? `${API_ROUTES.dashboard}?${query}` : API_ROUTES.dashboard);
}
