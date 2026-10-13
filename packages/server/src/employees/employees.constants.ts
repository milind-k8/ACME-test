import { EMPLOYEE_SORTS, SORT_ORDERS } from "@smt/shared/api-types";

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export const EMPLOYEE_MESSAGES = {
  invalidListQuery: "Invalid employee list query",
  page: "must be a whole number of 1 or more",
  pageSize: `must be a whole number from 1 to ${String(MAX_PAGE_SIZE)}`,
  sort: `must be one of ${EMPLOYEE_SORTS.join(", ")}`,
  order: `must be ${SORT_ORDERS.join(" or ")}`,
  invalidEmployee: "Some employee details are invalid",
  required: "is required",
  department: "must be one of the departments",
  country: "must be one of the supported countries",
  currency: "must be one of the supported currencies",
  salary: (decimals: number) =>
    decimals === 0
      ? "must be a positive whole amount"
      : `must be a positive amount with at most ${String(decimals)} decimals`,
  hiredAt: "must be a real date (YYYY-MM-DD)",
  futureHire: "can't be in the future",
} as const;
