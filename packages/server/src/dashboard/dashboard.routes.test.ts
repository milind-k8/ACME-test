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
    // The distribution and hiring series have their own test below.
    expect((await res.json()) as Dashboard).toMatchObject({
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
      byDepartment: [
        {
          department: "Engineering",
          headcount: 3,
          payrollUsdCents: 22_955_000,
          minUsdCents: 3_600_000,
          medianUsdCents: 4_355_000,
          avgUsdCents: 7_651_667,
          maxUsdCents: 15_000_000,
        },
      ],
      byJobTitle: [
        {
          jobTitle: "Software Engineer",
          headcount: 3,
          payrollUsdCents: 22_955_000,
          minUsdCents: 3_600_000,
          medianUsdCents: 4_355_000,
          avgUsdCents: 7_651_667,
          maxUsdCents: 15_000_000,
        },
      ],
    });
  });

  it("returns 401 without a session", async () => {
    expect((await getDashboard("", "")).status).toBe(401);
  });

  it("returns the salary distribution and hires per month", async () => {
    const body = (await (await getDashboard()).json()) as Dashboard;

    // $36,000 and $43,550 in the $25–50k band; $150,000 in $150–175k.
    expect(body.salaryBands.map((b) => b.headcount)).toEqual([0, 2, 0, 0, 0, 0, 1, 0, 0]);
    expect(body.hiresByMonth).toHaveLength(12);
    expect(body.hiresByMonth.find((m) => m.month === "2026-03")).toEqual({ month: "2026-03", hires: 1 });
  });
});

describe("GET /api/dashboard filters", () => {
  const summaryOf = async (query: string) => ((await (await getDashboard(query)).json()) as Dashboard).summary;

  beforeEach(() => {
    replaceAllEmployees(server.db, [
      { ...person(1, 15_000_000, "USD", "US", "2020-01-01"), department: "Engineering", jobTitle: "Data Analyst" },
      { ...person(2, 12_000_000, "USD", "US", "2020-01-01"), department: "Sales", jobTitle: "Account Executive" },
      { ...person(3, 300_000_000, "INR", "IN", "2020-01-01"), department: "Engineering", jobTitle: "Data Analyst" },
    ]);
  });

  it.each([
    ["?country=US", 2],
    ["?department=Engineering", 2],
    ["?jobTitle=Account%20Executive", 1],
    ["?country=US&department=Engineering", 1],
    ["?country=%20US%20", 2],
    ["?country=", 3],
  ])("%s narrows the headcount to %p", async (query, headcount) => {
    expect((await summaryOf(query)).headcount).toBe(headcount);
  });

  it("narrows the tables and charts too", async () => {
    const body = (await (await getDashboard("?jobTitle=Data%20Analyst")).json()) as Dashboard;

    expect(body.byCountry.map((c) => c.country).sort()).toEqual(["IN", "US"]);
    expect(body.byDepartment.map((d) => d.department)).toEqual(["Engineering"]);
    expect(body.salaryBands.reduce((sum, b) => sum + b.headcount, 0)).toBe(2);
  });

  it("returns 200 with nothing in it for an unknown value", async () => {
    const res = await getDashboard("?country=ZZ");

    expect(res.status).toBe(200);
    const body = (await res.json()) as Dashboard;
    expect(body.summary.headcount).toBe(0);
    expect(body.byCountry).toEqual([]);
  });
});

describe("GET /api/dashboard original currency", () => {
  beforeEach(() => {
    replaceAllEmployees(server.db, [
      { ...person(1, 300_000_000, "INR", "IN", "2020-01-01"), department: "Engineering" },
      { ...person(2, 500_000_000, "INR", "IN", "2020-01-01"), department: "Engineering" },
      { ...person(3, 15_000_000, "USD", "US", "2020-01-01"), department: "Engineering" },
    ]);
  });

  it("gives a single-currency country its figures in that currency", async () => {
    const body = (await (await getDashboard()).json()) as Dashboard;

    const india = body.byCountry.find((c) => c.country === "IN");
    expect(india?.local).toMatchObject({ currency: "INR", medianMinor: 400_000_000 });
    expect(body.byDepartment[0]?.local).toBeNull(); // Engineering spans INR and USD
  });

  it("makes department rows single-currency once filtered to one country", async () => {
    const body = (await (await getDashboard("?country=IN")).json()) as Dashboard;

    expect(body.byDepartment[0]?.local).toMatchObject({ currency: "INR", payrollMinor: 800_000_000 });
  });
});
