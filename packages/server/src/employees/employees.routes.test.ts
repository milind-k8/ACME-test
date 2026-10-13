import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { Employee, EmployeeFilterOptions, Page } from "@smt/shared/api-types";
import { generateEmployees } from "../seed/generate-employees";
import { startTestServer } from "../test-support/test-server";
import { replaceAllEmployees } from "./employees.repository";

let server: Awaited<ReturnType<typeof startTestServer>>;

const seeded = generateEmployees(200, 7);
// SQLite assigns ids in insert order, so the seeded rows' ids are 1..200.
const stored: Employee[] = seeded.map((e, i) => ({ id: i + 1, ...e }));

beforeEach(async () => {
  server = await startTestServer();
  replaceAllEmployees(server.db, seeded);
});

afterEach(async () => {
  await server.stop();
});

function getEmployees(query = "", cookie = server.loginCookie): Promise<Response> {
  return fetch(`${server.url}/api/employees${query}`, { headers: { Cookie: cookie } });
}

// Code-point order, matching SQLite's default BINARY collation.
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const byName = (a: Employee, b: Employee) =>
  compare(a.lastName, b.lastName) || compare(a.firstName, b.firstName) || a.id - b.id;

describe("GET /api/employees", () => {
  it("returns the first 50 employees sorted by last then first name, with the total", async () => {
    const res = await getEmployees();

    expect(res.status).toBe(200);
    const body = (await res.json()) as Page<Employee>;
    expect(body.total).toBe(200);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(50);
    expect(body.items).toEqual([...stored].sort(byName).slice(0, 50));
  });

  it("returns the next 50 of the same ordering for page 2", async () => {
    const body = (await (await getEmployees("?page=2")).json()) as Page<Employee>;

    expect(body.page).toBe(2);
    expect(body.items).toEqual([...stored].sort(byName).slice(50, 100));
  });

  it("returns an empty list with the real total for a page past the end", async () => {
    const body = (await (await getEmployees("?page=99&pageSize=10")).json()) as Page<Employee>;

    expect(body).toEqual({ items: [], total: 200, page: 99, pageSize: 10 });
  });

  it("returns 400 with the bad field for an invalid pageSize", async () => {
    const res = await getEmployees("?pageSize=500");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: {
        code: "validation",
        message: "Invalid employee list query",
        details: { pageSize: "must be a whole number from 1 to 100" },
      },
    });
  });

  it("filters by country, counting only the matches in the total", async () => {
    const body = (await (await getEmployees("?country=IN&pageSize=100")).json()) as Page<Employee>;

    const expected = stored.filter((e) => e.country === "IN");
    expect(expected.length).toBeGreaterThan(0);
    expect(body.total).toBe(expected.length);
    expect(body.items).toEqual(expected.sort(byName));
  });

  it.each([
    ["department", "Engineering", (e: Employee) => e.department === "Engineering"],
    ["jobTitle", "Data Analyst", (e: Employee) => e.jobTitle === "Data Analyst"],
  ] as const)("filters by %s with an exact match", async (filter, value, matches) => {
    const body = (await (
      await getEmployees(`?${filter}=${encodeURIComponent(value)}&pageSize=100`)
    ).json()) as Page<Employee>;

    expect(body.items).toEqual(stored.filter(matches).sort(byName));
  });

  it("combines filters", async () => {
    const body = (await (
      await getEmployees("?country=IN&department=Engineering&pageSize=100")
    ).json()) as Page<Employee>;

    expect(body.items).toEqual(stored.filter((e) => e.country === "IN" && e.department === "Engineering").sort(byName));
  });

  it("returns an empty list, not an error, for an unknown filter value", async () => {
    const res = await getEmployees("?country=ZZ");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [], total: 0, page: 1, pageSize: 50 });
  });

  it("returns 401 without a session", async () => {
    const res = await getEmployees("", "");

    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("unauthenticated");
  });
});

describe("GET /api/employees/filters", () => {
  const distinctSorted = (values: string[]) => [...new Set(values)].sort();

  it("returns the distinct countries, departments, and job titles, each sorted", async () => {
    const res = await fetch(`${server.url}/api/employees/filters`, { headers: { Cookie: server.loginCookie } });

    expect(res.status).toBe(200);
    expect((await res.json()) as EmployeeFilterOptions).toEqual({
      countries: distinctSorted(stored.map((e) => e.country)),
      departments: distinctSorted(stored.map((e) => e.department)),
      jobTitles: distinctSorted(stored.map((e) => e.jobTitle)),
    });
  });

  it("returns 401 without a session", async () => {
    const res = await fetch(`${server.url}/api/employees/filters`);

    expect(res.status).toBe(401);
  });
});
