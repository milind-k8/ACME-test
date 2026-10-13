import { describe, expect, it } from "bun:test";
import { generateEmployees } from "./generate-employees";

const employees = generateEmployees(10_000, 42);

describe("generateEmployees", () => {
  it("generates the requested number of employees", () => {
    expect(employees).toHaveLength(10_000);
  });

  it("generates identical employees for the same seed", () => {
    expect(generateEmployees(10_000, 42)).toEqual(employees);
  });

  it("generates different employees for a different seed", () => {
    expect(generateEmployees(10_000, 43)).not.toEqual(employees);
  });

  it("gives every employee a positive whole-number salary", () => {
    const invalid = employees.filter((e) => !Number.isInteger(e.salaryMinor) || e.salaryMinor <= 0);
    expect(invalid).toEqual([]);
  });

  it("numbers employees E00001 to E10000", () => {
    expect(employees.map((e) => e.employeeNumber)).toEqual(
      Array.from({ length: 10_000 }, (_, i) => `E${String(i + 1).padStart(5, "0")}`),
    );
  });

  it("gives every employee a first and last name", () => {
    const invalid = employees.filter((e) => !e.firstName.trim() || !e.lastName.trim());
    expect(invalid).toEqual([]);
  });

  it("hires everyone on a real date between 2010-01-01 and 2026-09-30", () => {
    const isRealDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d).toISOString().startsWith(d);
    const invalid = employees.filter(
      (e) => !isRealDate(e.hiredAt) || e.hiredAt < "2010-01-01" || e.hiredAt > "2026-09-30",
    );
    expect(invalid).toEqual([]);
  });
});
