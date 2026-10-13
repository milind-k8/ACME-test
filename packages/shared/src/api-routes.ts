// Every API path, used by the server's route table and the web's API calls.
export const API_ROUTES = {
  login: "/api/login",
  logout: "/api/logout",
  me: "/api/me",
  employees: "/api/employees",
  /** Route pattern; the web builds paths with employeePath(id). */
  employee: "/api/employees/:id",
  employeeFilters: "/api/employees/filters",
  employeeFormOptions: "/api/employees/form-options",
  dashboard: "/api/dashboard",
} as const;

export function employeePath(id: number): string {
  return API_ROUTES.employee.replace(":id", String(id));
}
