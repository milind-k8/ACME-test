import {
  EMPLOYEE_FILTERS,
  EMPLOYEE_SORTS,
  SORT_ORDERS,
  type EmployeeFilters,
  type EmployeeSort,
  type SortOrder,
} from "@smt/shared/api-types";
import { DEFAULT_PAGE_SIZE, EMPLOYEE_MESSAGES, MAX_PAGE_SIZE } from "./employees.constants";

export interface EmployeeListQuery extends EmployeeFilters {
  page: number;
  pageSize: number;
  q?: string;
  /** Absent means alphabetical, or best match first when searching. */
  sort?: EmployeeSort;
  order?: SortOrder;
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

function oneOf<T extends string>(allowed: readonly T[], raw: string | null): raw is T {
  return (allowed as readonly string[]).includes(raw ?? "");
}

export function validateListQuery(params: URLSearchParams): ListQueryValidation {
  const page = positiveInt(params.get("page"), 1);
  const pageSize = positiveInt(params.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const sort = params.get("sort");
  const order = params.get("order");

  const errors: Record<string, string> = {};
  if (page === null) errors.page = EMPLOYEE_MESSAGES.page;
  if (pageSize === null) errors.pageSize = EMPLOYEE_MESSAGES.pageSize;
  if (sort !== null && !oneOf(EMPLOYEE_SORTS, sort)) errors.sort = EMPLOYEE_MESSAGES.sort;
  if (order !== null && !oneOf(SORT_ORDERS, order)) errors.order = EMPLOYEE_MESSAGES.order;

  if (page === null || pageSize === null || Object.keys(errors).length > 0) return { ok: false, errors };

  const value: EmployeeListQuery = { page, pageSize };
  for (const filter of EMPLOYEE_FILTERS) {
    const raw = params.get(filter)?.trim();
    if (raw) value[filter] = raw;
  }
  const q = params.get("q")?.trim();
  if (q) value.q = q;
  if (oneOf(EMPLOYEE_SORTS, sort)) value.sort = sort;
  if (oneOf(SORT_ORDERS, order)) value.order = order;
  return { ok: true, value };
}
