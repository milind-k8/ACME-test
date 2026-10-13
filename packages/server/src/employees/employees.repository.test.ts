import { beforeEach, describe, expect, it } from "bun:test";
import type { NewEmployee } from "@smt/shared/api-types";
import type { Database } from "bun:sqlite";
import { openDatabase } from "../db/connection";
import { generateEmployees } from "../seed/generate-employees";
import { replaceAllEmployees } from "./employees.repository";

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
