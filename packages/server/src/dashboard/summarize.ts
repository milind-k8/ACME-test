import type { DashboardSummary, PayStats } from "@smt/shared/api-types";

/** Middle value of an already-sorted list; an even count averages the middle two (rounded to a whole cent). */
export function median(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? (sorted[mid] ?? 0) : Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

/** Stats for one group. `sorted` is USD cents in ascending order (ADR-007: the query sorts once). */
export function payStats(sorted: readonly number[]): PayStats {
  const headcount = sorted.length;
  const payroll = sorted.reduce((sum, cents) => sum + cents, 0);
  return {
    headcount,
    payrollUsdCents: payroll,
    minUsdCents: sorted[0] ?? 0,
    medianUsdCents: median(sorted),
    avgUsdCents: headcount === 0 ? 0 : Math.round(payroll / headcount),
    maxUsdCents: sorted[headcount - 1] ?? 0,
  };
}

/** One employee as the dashboard query returns it: already filtered, converted to USD cents, and sorted by it. */
export interface PayRow {
  country: string;
  department: string;
  jobTitle: string;
  usdCents: number;
  hiredAt: string;
}

const DAY_MS = 86_400_000;
const DAYS_PER_YEAR = 365.25;

const dayNumber = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`) / DAY_MS;

/** The same calendar day one year earlier (29 Feb → 28 Feb). */
function oneYearBefore(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() - 1);
  // setUTCFullYear turns 29 Feb into 1 Mar in a non-leap year; step back to 28 Feb.
  if (date.toISOString().slice(5, 10) !== isoDate.slice(5, 10)) date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

/** Headline figures. `today` is YYYY-MM-DD from the caller's clock, so date-based figures are testable. */
export function summarize(rows: readonly PayRow[], today: string): DashboardSummary {
  const yearAgo = oneYearBefore(today);
  const todayDay = dayNumber(today);
  let hires = 0;
  let tenureDays = 0;
  for (const r of rows) {
    if (r.hiredAt > yearAgo) hires++;
    tenureDays += todayDay - dayNumber(r.hiredAt);
  }
  const avgTenureYears = rows.length === 0 ? 0 : Math.round((tenureDays / rows.length / DAYS_PER_YEAR) * 10) / 10;
  return { ...payStats(rows.map((r) => r.usdCents)), hiresLast12Months: hires, avgTenureYears };
}

type GroupField = "country" | "department" | "jobTitle";

/**
 * Stats per value of `field`, largest headcount (or highest median) first, ties alphabetical. One pass: the rows arrive sorted by
 * salary, so appending keeps every group's list sorted and its median is the middle element (ADR-007).
 */
export function groupBy<F extends GroupField>(
  rows: readonly PayRow[],
  field: F,
  orderBy: "headcount" | "median" = "headcount",
): (PayStats & Record<F, string>)[] {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const key = r[field];
    const list = groups.get(key);
    if (list) list.push(r.usdCents);
    else groups.set(key, [r.usdCents]);
  }
  return [...groups]
    .map(([key, sorted]) => ({ [field]: key, ...payStats(sorted) }) as PayStats & Record<F, string>)
    .sort(
      (a, b) =>
        (orderBy === "median" ? b.medianUsdCents - a.medianUsdCents : b.headcount - a.headcount) ||
        (a[field] < b[field] ? -1 : 1),
    );
}
