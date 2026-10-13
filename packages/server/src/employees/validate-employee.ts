import type { EmployeeInput, NewEmployee } from "@smt/shared/api-types";
import { EMPLOYEE_MESSAGES } from "./employees.constants";

function decimalsOf(currency: string): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

/**
 * "85000.50" in USD → 8500050. String arithmetic only: no parseFloat, so no float ever holds a salary.
 * Returns null for anything that isn't a positive amount with at most the currency's decimals.
 */
export function parseSalary(text: string, currency: string): number | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (!match || !/^[A-Z]{3}$/.test(currency)) return null;
  const [, whole = "", fraction = ""] = match;
  const decimals = decimalsOf(currency);
  if (fraction.length > decimals) return null;
  const minor = Number(whole + fraction.padEnd(decimals, "0"));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

export interface EmployeeReferenceData {
  departments: ReadonlySet<string>;
  countries: ReadonlySet<string>;
  currencies: ReadonlySet<string>;
}

export type ValidEmployee = Omit<NewEmployee, "employeeNumber">;
export type EmployeeValidation = { ok: true; value: ValidEmployee } | { ok: false; errors: Record<string, string> };

// A real calendar date: Date would roll 2026-02-30 over to March, so round-trip it.
function isRealDate(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && new Date(`${text}T00:00:00Z`).toISOString().startsWith(text);
}

/** `today` is YYYY-MM-DD from the caller's clock, so the "no future hire dates" rule is testable. */
export function validateEmployee(body: unknown, ref: EmployeeReferenceData, today: string): EmployeeValidation {
  const fields = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const text = (name: keyof EmployeeInput) => {
    const value = fields[name];
    return typeof value === "string" ? value.trim() : "";
  };
  const firstName = text("firstName");
  const lastName = text("lastName");
  const jobTitle = text("jobTitle");
  const department = text("department");
  const country = text("country");
  const currency = text("currency");
  const hiredAt = text("hiredAt");

  const errors: Record<string, string> = {};
  if (!firstName) errors.firstName = EMPLOYEE_MESSAGES.required;
  if (!lastName) errors.lastName = EMPLOYEE_MESSAGES.required;
  if (!jobTitle) errors.jobTitle = EMPLOYEE_MESSAGES.required;
  if (!ref.departments.has(department)) errors.department = EMPLOYEE_MESSAGES.department;
  if (!ref.countries.has(country)) errors.country = EMPLOYEE_MESSAGES.country;
  const knownCurrency = ref.currencies.has(currency);
  if (!knownCurrency) errors.currency = EMPLOYEE_MESSAGES.currency;
  // Only judge the amount once the currency (and so its decimals) is known.
  const salaryMinor = knownCurrency ? parseSalary(text("salary"), currency) : null;
  if (knownCurrency && salaryMinor === null) errors.salary = EMPLOYEE_MESSAGES.salary(decimalsOf(currency));
  if (!isRealDate(hiredAt)) errors.hiredAt = EMPLOYEE_MESSAGES.hiredAt;
  else if (hiredAt > today) errors.hiredAt = EMPLOYEE_MESSAGES.futureHire;

  if (Object.keys(errors).length > 0 || salaryMinor === null) return { ok: false, errors };
  return { ok: true, value: { firstName, lastName, jobTitle, department, country, currency, salaryMinor, hiredAt } };
}

/** A path id: digits only, so "1.5", "-1" and "abc" are treated as not found. */
export function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}
