import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type {
  Employee,
  EmployeeFilterOptions,
  EmployeeFormOptions,
  EmployeeInput,
  NewEmployee,
  Page,
} from "@smt/shared/api-types";
import { generateEmployees } from "../seed/generate-employees";
import { startTestServer } from "../test-support/test-server";
import { replaceAllEmployees } from "./employees.repository";

let server: Awaited<ReturnType<typeof startTestServer>>;

const seeded = generateEmployees(200, 7);
// SQLite assigns ids in insert order, so the seeded rows' ids are 1..200.
const stored: Employee[] = seeded.map((e, i) => ({ id: i + 1, ...e }));

// A fixed clock, so "hire dates can't be in the future" doesn't depend on when the tests run.
const now = () => new Date("2026-10-13T12:00:00Z");

beforeEach(async () => {
  server = await startTestServer({ now });
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

describe("POST /api/employees", () => {
  const input: EmployeeInput = {
    firstName: " Aarav ",
    lastName: "Mishra",
    jobTitle: "Data Analyst",
    department: "Data",
    country: "IN",
    currency: "INR",
    salary: "1850000.50",
    hiredAt: "2026-10-01",
  };

  const post = (body: unknown, cookie = server.loginCookie) =>
    fetch(`${server.url}/api/employees`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("stores a new hire with the next employee number and returns it", async () => {
    const res = await post(input);

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      id: 201,
      employeeNumber: "E00201",
      firstName: "Aarav",
      lastName: "Mishra",
      jobTitle: "Data Analyst",
      department: "Data",
      country: "IN",
      currency: "INR",
      salaryMinor: 185_000_050,
      hiredAt: "2026-10-01",
    });
  });

  it("returns 400 with every bad field", async () => {
    const res = await post({ ...input, lastName: "", department: "Legal", salary: "0" });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; details: Record<string, string> } };
    expect(body.error.code).toBe("validation");
    expect(Object.keys(body.error.details).sort()).toEqual(["department", "lastName", "salary"]);
  });

  it("returns 400 for a body that isn't JSON", async () => {
    const res = await fetch(`${server.url}/api/employees`, {
      method: "POST",
      headers: { Cookie: server.loginCookie, "Content-Type": "application/json" },
      body: "{not json",
    });

    expect(res.status).toBe(400);
  });

  it("rejects a hire date after today on the server's clock", async () => {
    const res = await post({ ...input, hiredAt: "2099-01-01" });

    expect(res.status).toBe(400);
  });

  it("returns 401 without a session", async () => {
    expect((await post(input, "")).status).toBe(401);
  });

  it("adds a new job title to the filter options", async () => {
    await post({ ...input, jobTitle: "Chief Happiness Officer" });

    const res = await fetch(`${server.url}/api/employees/filters`, { headers: { Cookie: server.loginCookie } });
    expect(((await res.json()) as EmployeeFilterOptions).jobTitles).toContain("Chief Happiness Officer");
  });
});

describe("GET /api/employees/form-options", () => {
  it("returns the departments, countries with their usual currency, and currencies", async () => {
    const res = await fetch(`${server.url}/api/employees/form-options`, { headers: { Cookie: server.loginCookie } });

    expect(res.status).toBe(200);
    const body = (await res.json()) as EmployeeFormOptions;
    expect(body.departments).toContain("Engineering");
    expect(body.countries).toContainEqual({ code: "IN", currency: "INR" });
    expect(body.currencies).toEqual([...body.currencies].sort());
  });

  it("returns 401 without a session", async () => {
    expect((await fetch(`${server.url}/api/employees/form-options`)).status).toBe(401);
  });
});

describe("PUT /api/employees/:id", () => {
  const original = stored[0] as Employee;
  const input: EmployeeInput = {
    firstName: "Renamed",
    lastName: "Person",
    jobTitle: "Engineering Manager",
    department: "Engineering",
    country: "US",
    currency: "USD",
    salary: "210000",
    hiredAt: "2015-06-01",
  };

  const put = (id: string | number, body: unknown, cookie = server.loginCookie) =>
    fetch(`${server.url}/api/employees/${String(id)}`, {
      method: "PUT",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("updates the employee and keeps their employee number", async () => {
    const res = await put(original.id, input);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: original.id,
      employeeNumber: original.employeeNumber,
      firstName: "Renamed",
      lastName: "Person",
      jobTitle: "Engineering Manager",
      department: "Engineering",
      country: "US",
      currency: "USD",
      salaryMinor: 21_000_000,
      hiredAt: "2015-06-01",
    });
  });

  it("finds the employee by their new name", async () => {
    await put(original.id, input);

    const body = (await (await getEmployees("?q=renamed")).json()) as Page<Employee>;
    expect(body.items.map((e) => e.id)).toEqual([original.id]);
  });

  it("returns 400 with the bad fields", async () => {
    const res = await put(original.id, { ...input, currency: "XXX" });

    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: { details: Record<string, string> } }).error.details).toHaveProperty(
      "currency",
    );
  });

  it.each(["99999", "abc", "1.5", "-1"])("returns 404 for id %p", async (id) => {
    expect((await put(id, input)).status).toBe(404);
  });

  it("returns 401 without a session", async () => {
    expect((await put(original.id, input, "")).status).toBe(401);
  });
});

describe("DELETE /api/employees/:id", () => {
  const target = stored[0] as Employee;
  const del = (id: string | number, cookie = server.loginCookie) =>
    fetch(`${server.url}/api/employees/${String(id)}`, { method: "DELETE", headers: { Cookie: cookie } });

  it("removes the employee from the list and from search", async () => {
    const res = await del(target.id);

    expect(res.status).toBe(204);
    const all = (await (await getEmployees("?pageSize=100")).json()) as Page<Employee>;
    expect(all.total).toBe(199);
    const found = (await (
      await getEmployees(`?q=${encodeURIComponent(target.lastName)}&pageSize=100`)
    ).json()) as Page<Employee>;
    expect(found.items.map((e) => e.id)).not.toContain(target.id);
  });

  it.each(["99999", "abc"])("returns 404 for id %p", async (id) => {
    expect((await del(id)).status).toBe(404);
  });

  it("returns 404 the second time", async () => {
    await del(target.id);

    expect((await del(target.id)).status).toBe(404);
  });

  it("returns 401 without a session", async () => {
    expect((await del(target.id, "")).status).toBe(401);
  });
});
