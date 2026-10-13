import { DEFAULT_PAGE_SIZE, EMPLOYEE_MESSAGES, MAX_PAGE_SIZE } from "./employees.constants";

export interface EmployeeListQuery {
  page: number;
  pageSize: number;
}

export type ListQueryValidation =
  { ok: true; value: EmployeeListQuery } | { ok: false; errors: Record<string, string> };

// Digits only, so "1.5", "1e3", "-1" and "" are rejected rather than coerced by Number().
function positiveInt(raw: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER): number | null {
  if (raw === null) return fallback;
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return value >= 1 && value <= max ? value : null;
}

export function validateListQuery(params: URLSearchParams): ListQueryValidation {
  const page = positiveInt(params.get("page"), 1);
  const pageSize = positiveInt(params.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  const errors: Record<string, string> = {};
  if (page === null) errors.page = EMPLOYEE_MESSAGES.page;
  if (pageSize === null) errors.pageSize = EMPLOYEE_MESSAGES.pageSize;

  return page === null || pageSize === null ? { ok: false, errors } : { ok: true, value: { page, pageSize } };
}
