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
