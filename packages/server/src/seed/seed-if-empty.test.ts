import { beforeEach, describe, expect, it } from "bun:test";
import type { Database } from "bun:sqlite";
import { openDatabase } from "../db/connection";
import type { NewEmployee } from "@smt/shared/api-types";
import { countEmployees, replaceAllEmployees } from "../employees/employees.repository";
import { generateEmployees } from "./generate-employees";
import { seedIfEmpty } from "./seed-if-empty";

let db: Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("seedIfEmpty", () => {
  it("fills an empty database with the same 10,000 employees as bun run seed", () => {
    expect(seedIfEmpty(db)).toBe(true);

    const stored = db
      .query<NewEmployee, []>(
        `SELECT employee_number AS employeeNumber, first_name AS firstName, last_name AS lastName,
                job_title AS jobTitle, department, country, salary_minor AS salaryMinor, currency, hired_at AS hiredAt
         FROM employees ORDER BY id`,
      )
      .all();
    expect(stored).toEqual(generateEmployees(10_000, 42));
  });

  it("leaves a database that already has employees alone", () => {
    replaceAllEmployees(db, generateEmployees(1, 7));

    expect(seedIfEmpty(db)).toBe(false);

    expect(countEmployees(db)).toBe(1);
  });
});
