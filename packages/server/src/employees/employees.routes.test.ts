import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { Employee, EmployeeFilterOptions, NewEmployee, Page } from "@smt/shared/api-types";
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

describe("GET /api/employees?q=", () => {
  const person = (n: number, firstName: string, lastName: string, country: string): NewEmployee => ({
    employeeNumber: `T${String(n)}`,
    firstName,
    lastName,
    jobTitle: "Software Engineer",
    department: "Engineering",
    country,
    salaryMinor: 100_000,
    currency: "USD",
    hiredAt: "2020-01-01",
  });
  const people = [
    person(1, "Krishna", "Sharma", "IN"),
    person(2, "Krishnaveni", "Iyer", "IN"),
    person(3, "Priya", "Sharma", "IN"),
    person(4, "José", "García", "ES"),
    person(5, "Anna", "Sharma", "DE"),
  ];

  beforeEach(() => {
    replaceAllEmployees(server.db, people);
  });

  const search = async (query: string) => {
    const res = await getEmployees(query);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Page<Employee>;
    return body.items.map((e) => `${e.firstName} ${e.lastName}`).sort();
  };

  it("finds first or last names starting with the text", async () => {
    expect(await search("?q=krishna")).toEqual(["Krishna Sharma", "Krishnaveni Iyer"]);
  });

  it("ignores letter case and accents", async () => {
    expect(await search("?q=JOSE")).toEqual(["José García"]);
    expect(await search("?q=garcia")).toEqual(["José García"]);
  });

  it("treats each word as a prefix that must all match", async () => {
    expect(await search("?q=kri%20sha")).toEqual(["Krishna Sharma"]);
  });

  it("combines search with filters", async () => {
    expect(await search("?q=sharma&country=IN")).toEqual(["Krishna Sharma", "Priya Sharma"]);
  });

  it.each(['"', "*", "(", ":", "-", "a OR b", "NEAR(", "^x"])("treats %p as plain text, never a 500", async (q) => {
    await search(`?q=${encodeURIComponent(q)}`);
  });

  it("ignores a blank search", async () => {
    expect(await search("?q=%20%20")).toHaveLength(people.length);
  });
});

describe("GET /api/employees?sort=", () => {
  const usdCentsPerMinor: Record<string, number> = {};

  beforeEach(() => {
    for (const { currency, rate } of server.db
      .query<{ currency: string; rate: number }, []>("SELECT currency, usd_cents_per_minor AS rate FROM fx_rates")
      .all()) {
      usdCentsPerMinor[currency] = rate;
    }
  });

  const usd = (e: Employee) => e.salaryMinor * (usdCentsPerMinor[e.currency] ?? Number.NaN);
  const list = async (query: string) => ((await (await getEmployees(query)).json()) as Page<Employee>).items;

  it("sorts salaries by their USD value, so ¥6,500,000 ranks below $150,000", async () => {
    const base = stored[0] as Employee;
    replaceAllEmployees(server.db, [
      { ...base, employeeNumber: "Y1", salaryMinor: 6_500_000, currency: "JPY" },
      { ...base, employeeNumber: "U1", salaryMinor: 15_000_000, currency: "USD" },
    ]);

    expect((await list("?sort=salary&order=desc")).map((e) => e.employeeNumber)).toEqual(["U1", "Y1"]);
    expect((await list("?sort=salary")).map((e) => e.employeeNumber)).toEqual(["Y1", "U1"]);
  });

  it("orders the whole list by USD salary, across pages", async () => {
    const all = [...(await list("?sort=salary&pageSize=100")), ...(await list("?sort=salary&pageSize=100&page=2"))];

    expect(all.map(usd)).toEqual(stored.map(usd).sort((a, b) => a - b));
  });

  it.each([
    ["hiredAt", (e: Employee) => e.hiredAt],
    ["country", (e: Employee) => e.country],
  ] as const)("sorts by %s, newest/last first with order=desc", async (sort, key) => {
    const items = await list(`?sort=${sort}&order=desc&pageSize=100`);

    const keys = items.map(key);
    expect(keys).toEqual([...keys].sort().reverse());
  });

  it("breaks ties by id, so no employee repeats or goes missing between pages", async () => {
    const pages = await Promise.all([1, 2, 3, 4].map((page) => list(`?sort=country&pageSize=50&page=${String(page)}`)));

    const ids = pages.flat().map((e) => e.id);
    expect(new Set(ids).size).toBe(200);
  });

  it("returns 400 for an unknown sort column", async () => {
    const res = await getEmployees("?sort=salary_minor;DROP TABLE employees");

    expect(res.status).toBe(400);
  });
});
