import type { Database } from "bun:sqlite";
import type { PayRow } from "./summarize";

/**
 * Every employee's salary in USD cents, converted with the FX snapshot and sorted ascending, so each group the
 * dashboard builds from it is already in order (ADR-007). Rounded once per employee, before any sum.
 */
export function listPay(db: Database): PayRow[] {
  return db
    .query<PayRow, []>(
      `SELECT e.country, e.department, e.job_title AS jobTitle,
              CAST(round(e.salary_minor * fx.usd_cents_per_minor) AS INTEGER) AS usdCents, e.hired_at AS hiredAt
       FROM employees e
       JOIN fx_rates fx ON fx.currency = e.currency
       ORDER BY usdCents`,
    )
    .all();
}

/** The date of the FX snapshot every USD figure comes from. */
export function fxAsOf(db: Database): string {
  return db.query<{ asOf: string }, []>("SELECT max(as_of) AS asOf FROM fx_rates").get()?.asOf ?? "";
}
