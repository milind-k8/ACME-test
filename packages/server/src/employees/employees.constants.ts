import { EMPLOYEE_SORTS, SORT_ORDERS } from "@smt/shared/api-types";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export const EMPLOYEE_MESSAGES = {
  invalidListQuery: "Invalid employee list query",
  page: "must be a whole number of 1 or more",
  pageSize: `must be a whole number from 1 to ${String(MAX_PAGE_SIZE)}`,
  sort: `must be one of ${EMPLOYEE_SORTS.join(", ")}`,
  order: `must be ${SORT_ORDERS.join(" or ")}`,
} as const;
