import type { Database } from "bun:sqlite";
import { EMPLOYEE_FILTERS, type EmployeeFilter, type EmployeeFilters } from "@smt/shared/api-types";
import type { PayRow } from "./summarize";

// Column names come only from this fixed map; filter values are always bound as parameters.
const FILTER_COLUMNS: Record<EmployeeFilter, string> = {
  country: "e.country",
  department: "e.department",
  jobTitle: "e.job_title",
};

/**
 * The filtered employees' salaries in USD cents, converted with the FX snapshot and sorted ascending, so each group
 * the dashboard builds from them is already in order (ADR-007). Rounded once per employee, before any sum.
 * Filters use the employees indexes.
 */
export function listPay(db: Database, filters: EmployeeFilters = {}): PayRow[] {
  const conditions: string[] = [];
  const values: string[] = [];
  for (const filter of EMPLOYEE_FILTERS) {
    const value = filters[filter];
    if (value === undefined) continue;
    conditions.push(`${FILTER_COLUMNS[filter]} = ?`);
    values.push(value);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return db
    .query<PayRow, string[]>(
      `SELECT e.country, e.department, e.job_title AS jobTitle,
              CAST(round(e.salary_minor * fx.usd_cents_per_minor) AS INTEGER) AS usdCents, e.hired_at AS hiredAt
       FROM employees e
       JOIN fx_rates fx ON fx.currency = e.currency
       ${where}
       ORDER BY usdCents`,
    )
    .all(...values);
}

/** The date of the FX snapshot every USD figure comes from. */
export function fxAsOf(db: Database): string {
  return db.query<{ asOf: string }, []>("SELECT max(as_of) AS asOf FROM fx_rates").get()?.asOf ?? "";
}
