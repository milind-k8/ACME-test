import { beforeEach, describe, expect, it } from "bun:test";
import type { NewEmployee } from "@smt/shared/api-types";
import type { Database } from "bun:sqlite";
import { openDatabase } from "../db/connection";
import { generateEmployees } from "../seed/generate-employees";
import { listEmployees, replaceAllEmployees } from "./employees.repository";
import type { EmployeeListQuery } from "./validate-list-query";

let db: Database;

const countEmployees = () => db.query<{ n: number }, []>("SELECT count(*) AS n FROM employees").get()?.n;

const validEmployee: NewEmployee = {
  employeeNumber: "E00001",
  firstName: "Priya",
  lastName: "Sharma",
  jobTitle: "Software Engineer",
  department: "Engineering",
  country: "IN",
  salaryMinor: 300_000_000,
  currency: "INR",
  hiredAt: "2020-01-15",
};

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("replaceAllEmployees", () => {
  // Also proves every seeded currency exists in the fx_rates snapshot, since the foreign key would reject it otherwise.
  it("stores every generated employee", () => {
    replaceAllEmployees(db, generateEmployees(10_000, 42));

    expect(countEmployees()).toBe(10_000);
  });

  it("replaces existing employees instead of adding to them", () => {
    replaceAllEmployees(db, generateEmployees(10, 1));

    replaceAllEmployees(db, [validEmployee]);

    expect(countEmployees()).toBe(1);
  });
});

describe("employees table", () => {
  it.each([0, -1, 12.5])("rejects a salary_minor of %p", (salaryMinor) => {
    expect(() => {
      replaceAllEmployees(db, [{ ...validEmployee, salaryMinor }]);
    }).toThrow();
  });

  it("rejects a currency that is not in fx_rates", () => {
    expect(() => {
      replaceAllEmployees(db, [{ ...validEmployee, currency: "XXX" }]);
    }).toThrow("FOREIGN KEY constraint failed");
  });

  it("rejects a duplicate employee number", () => {
    expect(() => {
      replaceAllEmployees(db, [validEmployee, { ...validEmployee }]);
    }).toThrow("UNIQUE constraint failed: employees.employee_number");
  });

  it("rejects a country that is not an upper-case two-letter code", () => {
    expect(() => {
      replaceAllEmployees(db, [{ ...validEmployee, country: "in" }]);
    }).toThrow("CHECK constraint failed");
  });
});

// Records the SQL listEmployees runs, then asks SQLite how it would run each statement with those same parameters.
function queryPlans(query: EmployeeListQuery): string[] {
  const statements: { sql: string; params: unknown[] }[] = [];
  const recording = new Proxy(db, {
    get(target, key) {
      if (key !== "query") return Reflect.get(target, key) as unknown;
      return (sql: string) => {
        const statement = target.query(sql);
        const record = (params: unknown[]) => statements.push({ sql, params });
        return {
          all: (...params: unknown[]) => (record(params), statement.all(...(params as []))),
          get: (...params: unknown[]) => (record(params), statement.get(...(params as []))),
        };
      };
    },
  });
  listEmployees(recording, query);
  return statements.flatMap(({ sql, params }) =>
    db
      .query<{ detail: string }, []>(`EXPLAIN QUERY PLAN ${sql}`)
      .all(...(params as []))
      .map((row) => row.detail),
  );
}

describe("listEmployees query plans", () => {
  it.each([{ country: "IN" }, { department: "Engineering" }, { jobTitle: "Data Analyst" }])(
    "uses an index to filter by %o",
    (filter) => {
      replaceAllEmployees(db, generateEmployees(1_000, 42));
      db.run("ANALYZE");

      const plans = queryPlans({ page: 1, pageSize: 50, ...filter });

      expect(plans.length).toBeGreaterThan(0);
      // The table may appear under its alias "e"; "SCAN employees_fts" is the search index, not the table.
      expect(plans.filter((detail) => /^SCAN (employees|e)( |$)/.test(detail))).toEqual([]);
    },
  );
});

describe("name search index", () => {
  const names = (q: string) => listEmployees(db, { page: 1, pageSize: 50, q }).items.map((e) => e.lastName);

  it("follows a renamed employee", () => {
    replaceAllEmployees(db, [validEmployee]);

    db.run("UPDATE employees SET last_name = 'Verma' WHERE employee_number = 'E00001'");

    expect(names("verma")).toEqual(["Verma"]);
    expect(names("sharma")).toEqual([]);
  });

  it("forgets employees that were replaced", () => {
    replaceAllEmployees(db, [validEmployee]);

    replaceAllEmployees(db, [{ ...validEmployee, employeeNumber: "E00002", lastName: "Gupta" }]);

    expect(names("sharma")).toEqual([]);
  });
});
