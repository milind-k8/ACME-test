import type { DashboardSummary, GroupPay, LocalPay, MonthlyHires, PayStats, SalaryBand } from "@smt/shared/api-types";

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
  /** The stored amount, in minor units of `currency` */
  salaryMinor: number;
  currency: string;
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
): GroupPay<F>[] {
  // `currency` is null once a group mixes currencies. Within one currency, ordering by USD is the same as ordering
  // by the stored amount (the rate is positive), so `minor` stays sorted too.
  const groups = new Map<string, { usd: number[]; minor: number[]; currency: string | null }>();
  for (const r of rows) {
    const key = r[field];
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { usd: [r.usdCents], minor: [r.salaryMinor], currency: r.currency });
      continue;
    }
    group.usd.push(r.usdCents);
    group.minor.push(r.salaryMinor);
    if (group.currency !== r.currency) group.currency = null;
  }
  return [...groups]
    .map(
      ([key, g]) =>
        ({
          [field]: key,
          ...payStats(g.usd),
          local: g.currency === null ? null : localPay(g.currency, g.minor),
        }) as GroupPay<F>,
    )
    .sort(
      (a, b) =>
        (orderBy === "median" ? b.medianUsdCents - a.medianUsdCents : b.headcount - a.headcount) ||
        (a[field] < b[field] ? -1 : 1),
    );
}

/** The same figures as payStats, in one currency's minor units. `sorted` is ascending. */
function localPay(currency: string, sorted: readonly number[]): LocalPay {
  const stats = payStats(sorted);
  return {
    currency,
    payrollMinor: stats.payrollUsdCents,
    minMinor: stats.minUsdCents,
    medianMinor: stats.medianUsdCents,
    avgMinor: stats.avgUsdCents,
    maxMinor: stats.maxUsdCents,
  };
}

const BAND_USD_CENTS = 2_500_000; // $25,000
const BAND_COUNT = 9; // $0–25k … $175–200k, then $200k+

/** Headcount per $25,000 band, every band present, the last one open-ended. */
export function salaryBands(usdCents: readonly number[]): SalaryBand[] {
  const counts = new Array<number>(BAND_COUNT).fill(0);
  for (const cents of usdCents) {
    const band = Math.min(Math.floor(cents / BAND_USD_CENTS), BAND_COUNT - 1);
    counts[band] = (counts[band] ?? 0) + 1;
  }
  return counts.map((headcount, i) => ({
    fromUsdCents: i * BAND_USD_CENTS,
    toUsdCents: i === BAND_COUNT - 1 ? null : (i + 1) * BAND_USD_CENTS,
    headcount,
  }));
}

/** Hires in each of the 12 months ending with today's month, oldest first, every month present. */
export function hiresByMonth(rows: readonly PayRow[], today: string): MonthlyHires[] {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)); // 1–12
  const months = Array.from({ length: 12 }, (_, i) => {
    const index = year * 12 + (month - 1) - (11 - i);
    return `${String(Math.floor(index / 12))}-${String((index % 12) + 1).padStart(2, "0")}`;
  });
  const counts = new Map(months.map((m) => [m, 0]));
  for (const r of rows) {
    const key = r.hiredAt.slice(0, 7);
    const current = counts.get(key);
    if (current !== undefined) counts.set(key, current + 1);
  }
  return months.map((m) => ({ month: m, hires: counts.get(m) ?? 0 }));
}
