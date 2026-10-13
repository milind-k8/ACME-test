import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { Employee, Page } from "@smt/shared/api-types";
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

  it("returns 401 without a session", async () => {
    const res = await getEmployees("", "");

    expect(res.status).toBe(401);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("unauthenticated");
  });
});
