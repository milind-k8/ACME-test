import { describe, expect, it } from "bun:test";
import { groupBy, hiresByMonth, median, payStats, salaryBands, summarize, type PayRow } from "./summarize";

describe("median", () => {
  it.each([
    [[100], 100],
    [[100, 200, 400], 200],
    [[100, 200, 400, 1000], 300],
    [[100, 101], 101],
  ])("of %p is %p (sorted input; an even count averages the middle two, rounded)", (values, expected) => {
    expect(median(values)).toBe(expected);
  });
});

describe("payStats", () => {
  it("summarises sorted USD cents", () => {
    expect(payStats([100, 200, 400])).toEqual({
      headcount: 3,
      payrollUsdCents: 700,
      minUsdCents: 100,
      medianUsdCents: 200,
      avgUsdCents: 233,
      maxUsdCents: 400,
    });
  });

  it("is all zeros for no employees", () => {
    expect(payStats([])).toEqual({
      headcount: 0,
      payrollUsdCents: 0,
      minUsdCents: 0,
      medianUsdCents: 0,
      avgUsdCents: 0,
      maxUsdCents: 0,
    });
  });
});

const row = (usdCents: number, hiredAt: string): PayRow => ({
  country: "IN",
  department: "Engineering",
  jobTitle: "Software Engineer",
  usdCents,
  hiredAt,
});
const today = "2026-10-13";

describe("summarize", () => {
  it("gives the headline figures for all rows", () => {
    const summary = summarize([row(100, "2020-01-01"), row(200, "2020-01-01"), row(400, "2020-01-01")], today);

    expect(summary).toMatchObject(payStats([100, 200, 400]));
  });

  it("counts hires after the same day one year ago", () => {
    const rows = [row(1, "2025-10-13"), row(1, "2025-10-14"), row(1, "2026-10-13"), row(1, "2019-05-01")];

    expect(summarize(rows, today).hiresLast12Months).toBe(2);
  });

  it("on 29 February, looks back to 28 February of the previous year", () => {
    const rows = [row(1, "2027-02-28"), row(1, "2027-03-01")];

    expect(summarize(rows, "2028-02-29").hiresLast12Months).toBe(1);
  });

  it("averages tenure in years, to one decimal", () => {
    expect(summarize([row(1, "2025-10-13"), row(1, "2024-10-13")], today).avgTenureYears).toBe(1.5);
  });

  it("is zeros for no rows", () => {
    expect(summarize([], today)).toEqual({ ...payStats([]), hiresLast12Months: 0, avgTenureYears: 0 });
  });
});

describe("groupBy", () => {
  const at = (country: string, usdCents: number): PayRow => ({ ...row(usdCents, "2020-01-01"), country });

  it("gives each country its own stats, largest headcount first", () => {
    const rows = [at("IN", 100), at("US", 150), at("IN", 200), at("DE", 250), at("IN", 300), at("US", 400)];

    expect(groupBy(rows, "country")).toEqual([
      { country: "IN", ...payStats([100, 200, 300]) },
      { country: "US", ...payStats([150, 400]) },
      { country: "DE", ...payStats([250]) },
    ]);
  });

  it("breaks headcount ties alphabetically", () => {
    expect(groupBy([at("US", 1), at("DE", 2)], "country").map((g) => g.country)).toEqual(["DE", "US"]);
  });

  it("can order groups by median instead, highest first", () => {
    const titled = (jobTitle: string, usdCents: number): PayRow => ({ ...row(usdCents, "2020-01-01"), jobTitle });
    const rows = [titled("Analyst", 100), titled("Engineer", 300), titled("Analyst", 120), titled("Manager", 500)];

    expect(groupBy(rows, "jobTitle", "median").map((g) => g.jobTitle)).toEqual(["Manager", "Engineer", "Analyst"]);
  });
});

describe("salaryBands", () => {
  const dollars = (n: number) => n * 100;

  it("counts salaries in $25,000 bands, with every band present", () => {
    const bands = salaryBands([dollars(10_000), dollars(24_999), dollars(25_000), dollars(250_000)]);

    expect(bands).toHaveLength(9);
    expect(bands[0]).toEqual({ fromUsdCents: 0, toUsdCents: dollars(25_000), headcount: 2 });
    expect(bands[1]).toEqual({ fromUsdCents: dollars(25_000), toUsdCents: dollars(50_000), headcount: 1 });
    expect(bands[2]?.headcount).toBe(0);
    expect(bands[8]).toEqual({ fromUsdCents: dollars(200_000), toUsdCents: null, headcount: 1 });
  });
});

describe("hiresByMonth", () => {
  const hired = (hiredAt: string) => row(1, hiredAt);

  it("counts hires in each of the last 12 months, oldest first, with empty months as 0", () => {
    const months = hiresByMonth(
      [hired("2026-10-01"), hired("2026-10-12"), hired("2025-11-30"), hired("2025-10-31")],
      today,
    );

    expect(months.map((m) => m.month)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(months[0]).toEqual({ month: "2025-11", hires: 1 });
    expect(months[1]).toEqual({ month: "2025-12", hires: 0 });
    expect(months[11]).toEqual({ month: "2026-10", hires: 2 });
    expect(months.reduce((sum, m) => sum + m.hires, 0)).toBe(3);
  });

  it("crosses the year boundary in January", () => {
    expect(
      hiresByMonth([], "2027-01-05")
        .map((m) => m.month)
        .slice(0, 2),
    ).toEqual(["2026-02", "2026-03"]);
  });
});
