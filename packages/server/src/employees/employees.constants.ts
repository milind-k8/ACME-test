export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export const EMPLOYEE_MESSAGES = {
  invalidListQuery: "Invalid employee list query",
  page: "must be a whole number of 1 or more",
  pageSize: `must be a whole number from 1 to ${String(MAX_PAGE_SIZE)}`,
} as const;
