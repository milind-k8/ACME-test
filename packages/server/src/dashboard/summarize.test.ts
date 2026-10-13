import { describe, expect, it } from "bun:test";
import { groupBy, median, payStats, summarize, type PayRow } from "./summarize";

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
});
