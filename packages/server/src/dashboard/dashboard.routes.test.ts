import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { Dashboard, NewEmployee } from "@smt/shared/api-types";
import { replaceAllEmployees } from "../employees/employees.repository";
import { startTestServer } from "../test-support/test-server";

let server: Awaited<ReturnType<typeof startTestServer>>;
const now = () => new Date("2026-10-13T12:00:00Z");

const person = (n: number, salaryMinor: number, currency: string, country: string, hiredAt: string): NewEmployee => ({
  employeeNumber: `E${String(n).padStart(5, "0")}`,
  firstName: "A",
  lastName: "B",
  jobTitle: "Software Engineer",
  department: "Engineering",
  country,
  salaryMinor,
  currency,
  hiredAt,
});

beforeEach(async () => {
  server = await startTestServer({ now });
  replaceAllEmployees(server.db, [
    person(1, 15_000_000, "USD", "US", "2026-03-01"), // $150,000.00, hired 7 months ago
    person(2, 6_500_000, "JPY", "JP", "2016-10-13"), // ¥6,500,000 → $43,550.00, 10 years
    person(3, 300_000_000, "INR", "IN", "2021-10-13"), // ₹3,000,000.00 → $36,000.00, 5 years
  ]);
});

afterEach(async () => {
  await server.stop();
});

// Stats for a group of one employee.
const one = (usdCents: number) => ({
  headcount: 1,
  payrollUsdCents: usdCents,
  minUsdCents: usdCents,
  medianUsdCents: usdCents,
  avgUsdCents: usdCents,
  maxUsdCents: usdCents,
});

const getDashboard = (query = "", cookie = server.loginCookie) =>
  fetch(`${server.url}/api/dashboard${query}`, { headers: { Cookie: cookie } });

describe("GET /api/dashboard", () => {
  it("returns the headline figures in USD cents with the FX date", async () => {
    const res = await getDashboard();

    expect(res.status).toBe(200);
    expect((await res.json()) as Dashboard).toEqual({
      fxAsOf: "2026-10-01",
      summary: {
        headcount: 3,
        payrollUsdCents: 22_955_000,
        minUsdCents: 3_600_000,
        medianUsdCents: 4_355_000,
        avgUsdCents: 7_651_667,
        maxUsdCents: 15_000_000,
        hiresLast12Months: 1,
        avgTenureYears: 5.2,
      },
      // One employee each, so ties sort alphabetically.
      byCountry: [
        { country: "IN", ...one(3_600_000) },
        { country: "JP", ...one(4_355_000) },
        { country: "US", ...one(15_000_000) },
      ],
    });
  });

  it("returns 401 without a session", async () => {
    expect((await getDashboard("", "")).status).toBe(401);
  });
});
