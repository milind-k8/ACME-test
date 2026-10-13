// The API contract. Server and web meet only through these types.

import type { ErrorCode } from "./error-codes";

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; details?: Record<string, string> };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SessionUser {
  email: string;
}

export interface Employee {
  id: number;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  /** ISO 3166 alpha-2 */
  country: string;
  /** Integer, in minor units of `currency` */
  salaryMinor: number;
  /** ISO 4217 */
  currency: string;
  /** YYYY-MM-DD */
  hiredAt: string;
}

/** An employee before the database assigns its `id`. */
export type NewEmployee = Omit<Employee, "id">;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EmployeeFilterOptions {
  countries: string[];
  departments: string[];
  jobTitles: string[];
}

export const EMPLOYEE_SORTS = ["name", "salary", "hiredAt", "country"] as const;
export type EmployeeSort = (typeof EMPLOYEE_SORTS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** The body of a create or update. Salary is a decimal string in major units, so no float crosses the API. */
export interface EmployeeInput {
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  country: string;
  currency: string;
  /** Major units, e.g. "85000.50" */
  salary: string;
  /** YYYY-MM-DD */
  hiredAt: string;
}

export interface EmployeeFormOptions {
  departments: string[];
  countries: { code: string; currency: string }[];
  currencies: string[];
}
