import { describe, expect, it } from "bun:test";
import { parseSalary, validateEmployee } from "./validate-employee";

describe("parseSalary", () => {
  it.each([
    ["85000.50", "USD", 8_500_050],
    ["85000", "USD", 8_500_000],
    ["85000.5", "USD", 8_500_050],
    ["85000", "JPY", 85_000],
    [" 1200000 ", "INR", 120_000_000],
  ])("turns %p %s into %p minor units", (text, currency, minor) => {
    expect(parseSalary(text, currency)).toBe(minor);
  });

  it.each([
    ["100.5", "JPY"],
    ["100.123", "USD"],
    ["", "USD"],
    ["0", "USD"],
    ["0.00", "USD"],
    ["-5", "USD"],
    ["abc", "USD"],
    ["1e5", "USD"],
    ["1,000", "USD"],
    [".5", "USD"],
    ["5.", "USD"],
    ["99999999999999999", "USD"],
  ])("rejects %p in %s", (text, currency) => {
    expect(parseSalary(text, currency)).toBeNull();
  });
});

const ref = {
  departments: new Set(["Engineering", "Sales"]),
  countries: new Set(["IN", "US"]),
  currencies: new Set(["INR", "USD"]),
};
const today = "2026-10-13";
const body = {
  firstName: "Priya",
  lastName: "Sharma",
  jobTitle: "Software Engineer",
  department: "Engineering",
  country: "IN",
  currency: "INR",
  salary: "3000000",
  hiredAt: "2020-01-15",
};
const validate = (overrides: Record<string, unknown> = {}) => validateEmployee({ ...body, ...overrides }, ref, today);

describe("validateEmployee", () => {
  it("turns a valid body into a record with the salary in minor units", () => {
    expect(validate()).toEqual({
      ok: true,
      value: {
        firstName: "Priya",
        lastName: "Sharma",
        jobTitle: "Software Engineer",
        department: "Engineering",
        country: "IN",
        currency: "INR",
        salaryMinor: 300_000_000,
        hiredAt: "2020-01-15",
      },
    });
  });

  it("trims text fields", () => {
    const result = validate({ firstName: "  Priya ", jobTitle: " Software Engineer  " });
    expect(result.ok && result.value.firstName).toBe("Priya");
    expect(result.ok && result.value.jobTitle).toBe("Software Engineer");
  });

  it.each([
    ["firstName", "   "],
    ["lastName", ""],
    ["jobTitle", undefined],
    ["firstName", 42],
  ])("rejects a blank or missing %s (%p)", (field, value) => {
    expect(validate({ [field]: value })).toEqual({ ok: false, errors: { [field]: "is required" } });
  });

  it.each([
    ["department", "Legal", "must be one of the departments"],
    ["country", "FR", "must be one of the supported countries"],
    ["currency", "EUR", "must be one of the supported currencies"],
    ["salary", "100.123", "must be a positive amount with at most 2 decimals"],
    ["salary", "-5", "must be a positive amount with at most 2 decimals"],
    ["hiredAt", "2026-02-30", "must be a real date (YYYY-MM-DD)"],
    ["hiredAt", "2026-1-5", "must be a real date (YYYY-MM-DD)"],
    ["hiredAt", "2026-10-14", "can't be in the future"],
  ])("rejects %s %p", (field, value, message) => {
    expect(validate({ [field]: value })).toEqual({ ok: false, errors: { [field]: message } });
  });

  it("names the currency's decimals in the salary message", () => {
    expect(
      validateEmployee(
        { ...body, country: "US", currency: "JPY", salary: "1.5" },
        { ...ref, currencies: new Set(["JPY"]) },
        today,
      ),
    ).toEqual({
      ok: false,
      errors: { salary: "must be a positive whole amount" },
    });
  });

  it("accepts a hire date of today", () => {
    expect(validate({ hiredAt: today }).ok).toBe(true);
  });

  it("reports every invalid field at once", () => {
    const result = validate({ firstName: "", department: "Legal", salary: "0", hiredAt: "soon" });
    expect(result.ok ? [] : Object.keys(result.errors).sort()).toEqual([
      "department",
      "firstName",
      "hiredAt",
      "salary",
    ]);
  });

  it("rejects a body that isn't an object", () => {
    const result = validateEmployee(null, ref, today);
    expect(result.ok).toBe(false);
  });
});
