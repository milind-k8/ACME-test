import { beforeEach, describe, expect, it } from "bun:test";
import type { NewEmployee } from "@smt/shared/api-types";
import type { Database } from "bun:sqlite";
import { openDatabase } from "../db/connection";
import { fullScans, queryPlans } from "../test-support/query-plans";
import { generateEmployees } from "../seed/generate-employees";
import { createEmployee, getReferenceData, listEmployees, replaceAllEmployees } from "./employees.repository";
import { SEED_COUNTRIES, SEED_JOBS } from "../seed/data";

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
      // The reference trigger (005) fires before the CHECK; either one rejecting it is the point.
    }).toThrow(/CHECK constraint failed|unknown department or country/);
  });
});


describe("listEmployees query plans", () => {
  it.each([{ country: "IN" }, { department: "Engineering" }, { jobTitle: "Data Analyst" }])(
    "uses an index to filter by %o",
    (filter) => {
      replaceAllEmployees(db, generateEmployees(1_000, 42));
      db.run("ANALYZE");

      const plans = queryPlans(db, (recording) => listEmployees(recording, { page: 1, pageSize: 50, ...filter }));

      expect(plans.length).toBeGreaterThan(0);
      expect(fullScans(plans)).toEqual([]);
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

describe("reference data", () => {
  it("includes every department and country the seed uses", () => {
    const ref = getReferenceData(db);

    expect(ref.departments).toEqual([...new Set(SEED_JOBS.map((j) => j.department))].sort());
    expect(ref.countries).toEqual(
      SEED_COUNTRIES.map((c) => ({ code: c.code, currency: c.currency })).sort((a, b) => a.code.localeCompare(b.code)),
    );
    expect(ref.currencies).toEqual(["BRL", "CAD", "EUR", "GBP", "INR", "JPY", "USD"]);
  });

  it.each([
    ["department", { department: "Legal" }],
    ["country", { country: "FR" }],
  ])("rejects an unknown %s even without validation", (_name, change) => {
    expect(() => {
      replaceAllEmployees(db, [{ ...validEmployee, ...change }]);
    }).toThrow("unknown department or country");
  });

  it("rejects changing an employee to an unknown department", () => {
    replaceAllEmployees(db, [validEmployee]);

    expect(() => db.run("UPDATE employees SET department = 'Legal'")).toThrow("unknown department or country");
  });
});

describe("createEmployee", () => {
  const input = {
    firstName: validEmployee.firstName,
    lastName: validEmployee.lastName,
    jobTitle: validEmployee.jobTitle,
    department: validEmployee.department,
    country: validEmployee.country,
    salaryMinor: validEmployee.salaryMinor,
    currency: validEmployee.currency,
    hiredAt: validEmployee.hiredAt,
  };

  it("numbers the first employee E00001", () => {
    expect(createEmployee(db, input).employeeNumber).toBe("E00001");
  });

  it("gives the next number after the highest one", () => {
    replaceAllEmployees(db, [{ ...validEmployee, employeeNumber: "E10000" }]);

    const created = createEmployee(db, input);

    expect(created).toEqual({ ...input, id: 2, employeeNumber: "E10001" });
  });
});
