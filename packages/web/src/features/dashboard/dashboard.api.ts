import { API_ROUTES } from "@smt/shared/api-routes";
import type { Dashboard, EmployeeFilterOptions } from "@smt/shared/api-types";
import { api } from "@/lib/api";

export function getDashboard(params = new URLSearchParams()): Promise<Dashboard> {
  const query = params.toString();
  return api<Dashboard>(query ? `${API_ROUTES.dashboard}?${query}` : API_ROUTES.dashboard);
}

/** The same choices the employee list offers, so both pages filter alike. */
export function getFilterOptions(): Promise<EmployeeFilterOptions> {
  return api<EmployeeFilterOptions>(API_ROUTES.employeeFilters);
}
