import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Dashboard } from "@smt/shared/api-types";
import { replaceAllEmployees } from "../employees/employees.repository";
import { generateEmployees } from "../seed/generate-employees";
import { startTestServer } from "../test-support/test-server";
import * as repository from "./dashboard.repository";

// ADR-008: cached, but never stale.
let dir: string;
let path: string;
let clock: Date;
let server: Awaited<ReturnType<typeof startTestServer>>;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), "smt-cache-"));
  path = join(dir, "test.db");
  // Late evening, so the day-change test can cross midnight within the 8-hour session the cookie was signed for.
  clock = new Date("2026-10-13T22:00:00Z");
  server = await startTestServer({ now: () => clock, databasePath: path });
  replaceAllEmployees(server.db, generateEmployees(50, 3));
});

afterEach(async () => {
  await server.stop();
  server.db.close();
  rmSync(dir, { recursive: true });
});

const dashboard = async (query = "") =>
  (await (
    await fetch(`${server.url}/api/dashboard${query}`, { headers: { Cookie: server.loginCookie } })
  ).json()) as Dashboard;

describe("dashboard cache", () => {
  it("answers a repeated request without running the query again", async () => {
    const listPay = spyOn(repository, "listPay");
    await dashboard();
    await dashboard();

    expect(listPay).toHaveBeenCalledTimes(1);
    listPay.mockRestore();
  });

  it("keeps different filters apart", async () => {
    const all = await dashboard();
    const india = await dashboard("?country=IN");

    expect(india.summary.headcount).toBeLessThan(all.summary.headcount);
    expect((await dashboard()).summary.headcount).toBe(all.summary.headcount);
  });

  it("shows a new hire added through the API on the very next request", async () => {
    const before = (await dashboard()).summary.headcount;
    await fetch(`${server.url}/api/employees`, {
      method: "POST",
      headers: { Cookie: server.loginCookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "New",
        lastName: "Hire",
        jobTitle: "Data Analyst",
        department: "Data",
        country: "IN",
        currency: "INR",
        salary: "1500000",
        hiredAt: "2026-10-01",
      }),
    });

    expect((await dashboard()).summary.headcount).toBe(before + 1);
  });

  it("shows a change made by another process on the very next request", async () => {
    await dashboard();
    const other = new Database(path); // e.g. `bun run seed` while the API runs
    other.run("DELETE FROM employees WHERE id IN (SELECT id FROM employees LIMIT 10)");
    other.close();

    expect((await dashboard()).summary.headcount).toBe(40);
  });

  it("recomputes date-based figures when the day changes", async () => {
    // 23:00 → 01:00 next day: the date changes while the session is still valid.
    clock = new Date("2026-10-13T23:00:00Z");
    const [first] = generateEmployees(1, 9);
    replaceAllEmployees(server.db, [{ ...(first as NonNullable<typeof first>), hiredAt: "2025-10-14" }]);
    expect((await dashboard()).summary.hiresLast12Months).toBe(1);

    clock = new Date("2026-10-14T01:00:00Z");

    // On 2026-10-14 a hire from 2025-10-14 is exactly a year old, so it leaves the 12-month window.
    expect((await dashboard()).summary.hiresLast12Months).toBe(0);
  });
});
