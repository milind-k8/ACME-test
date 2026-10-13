import { API_ROUTES, employeePath } from "@smt/shared/api-routes";
import type { Employee, EmployeeFilterOptions, EmployeeFormOptions, EmployeeInput, Page } from "@smt/shared/api-types";
import { api } from "@/lib/api";

export function listEmployees(params = new URLSearchParams()): Promise<Page<Employee>> {
  const query = params.toString();
  return api<Page<Employee>>(query ? `${API_ROUTES.employees}?${query}` : API_ROUTES.employees);
}

export function getFilterOptions(): Promise<EmployeeFilterOptions> {
  return api<EmployeeFilterOptions>(API_ROUTES.employeeFilters);
}

export function getFormOptions(): Promise<EmployeeFormOptions> {
  return api<EmployeeFormOptions>(API_ROUTES.employeeFormOptions);
}

export function createEmployee(input: EmployeeInput): Promise<Employee> {
  return api<Employee>(API_ROUTES.employees, { method: "POST", body: JSON.stringify(input) });
}

export function updateEmployee(id: number, input: EmployeeInput): Promise<Employee> {
  return api<Employee>(employeePath(id), { method: "PUT", body: JSON.stringify(input) });
}

export function deleteEmployee(id: number): Promise<void> {
  return api<undefined>(employeePath(id), { method: "DELETE" });
}
