import { API_ROUTES } from "@smt/shared/api-routes";
import type { Employee, Page } from "@smt/shared/api-types";
import { api } from "@/lib/api";

export function listEmployees(params = new URLSearchParams()): Promise<Page<Employee>> {
  const query = params.toString();
  return api<Page<Employee>>(query ? `${API_ROUTES.employees}?${query}` : API_ROUTES.employees);
}
