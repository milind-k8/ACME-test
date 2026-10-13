import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Database as SqliteDatabase } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database } from "bun:sqlite";
import type { NewEmployee } from "@smt/shared/api-types";
import { openDatabase } from "../db/connection";
import { replaceAllEmployees } from "../employees/employees.repository";
import { generateEmployees } from "../seed/generate-employees";
import { fullScans, queryPlans } from "../test-support/query-plans";
import { dataVersion, fxAsOf, listPay } from "./dashboard.repository";

let db: Database;

const person = (n: number, salaryMinor: number, currency: string, country: string): NewEmployee => ({
  employeeNumber: `E${String(n).padStart(5, "0")}`,
  firstName: "A",
  lastName: "B",
  jobTitle: "Software Engineer",
  department: "Engineering",
  country,
  salaryMinor,
  currency,
  hiredAt: "2020-01-15",
});

beforeEach(() => {
  db = openDatabase(":memory:");
  replaceAllEmployees(db, [
    person(1, 15_000_000, "USD", "US"), // $150,000.00
    person(2, 6_500_000, "JPY", "JP"), // ¥6,500,000 × 0.67 = $43,550.00
    person(3, 300_000_000, "INR", "IN"), // ₹3,000,000.00 × 0.012 = $36,000.00
  ]);
});

describe("listPay", () => {
  it("converts each salary to USD cents with the snapshot rate and sorts by it", () => {
    expect(listPay(db, {}).map((r) => [r.country, r.usdCents])).toEqual([
      ["IN", 3_600_000],
      ["JP", 4_355_000],
      ["US", 15_000_000],
    ]);
  });

  it("returns the fields the dashboard groups by", () => {
    expect(listPay(db, {})[0]).toEqual({
      country: "IN",
      department: "Engineering",
      jobTitle: "Software Engineer",
      usdCents: 3_600_000,
      salaryMinor: 300_000_000,
      currency: "INR",
      hiredAt: "2020-01-15",
    });
  });
});

describe("fxAsOf", () => {
  it("is the snapshot date", () => {
    expect(fxAsOf(db)).toBe("2026-10-01");
  });
});

describe("listPay query plan", () => {
  it.each([{ country: "IN" }, { department: "Engineering" }, { jobTitle: "Data Analyst" }])(
    "uses an index to filter by %o",
    (filter) => {
      replaceAllEmployees(db, generateEmployees(1_000, 42));
      db.run("ANALYZE");

      const plans = queryPlans(db, (recording) => listPay(recording, filter));

      expect(plans.length).toBeGreaterThan(0);
      expect(fullScans(plans)).toEqual([]);
    },
  );
});

describe("dataVersion", () => {
  // A real file, so a second connection (like `bun run seed` in another process) can write to it.
  let dir: string;
  let fileDb: Database;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "smt-version-"));
    path = join(dir, "test.db");
    fileDb = openDatabase(path);
    replaceAllEmployees(fileDb, [person(1, 15_000_000, "USD", "US")]);
  });

  afterEach(() => {
    fileDb.close();
    rmSync(dir, { recursive: true });
  });

  it("stays the same across reads", () => {
    const before = dataVersion(fileDb);
    listPay(fileDb, {});

    expect(dataVersion(fileDb)).toBe(before);
  });

  it("changes after a write on the same connection", () => {
    const before = dataVersion(fileDb);
    fileDb.run("UPDATE employees SET salary_minor = salary_minor + 1");

    expect(dataVersion(fileDb)).not.toBe(before);
  });

  it("changes after another connection writes", () => {
    const before = dataVersion(fileDb);
    const other = new SqliteDatabase(path);
    other.run("DELETE FROM employees");
    other.close();

    expect(dataVersion(fileDb)).not.toBe(before);
  });
});
