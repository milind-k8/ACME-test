import { beforeAll, describe, expect, it } from "bun:test";
import type { Database } from "bun:sqlite";
import type { EmployeeFilters } from "@smt/shared/api-types";
import { openDatabase } from "../db/connection";
import { replaceAllEmployees } from "../employees/employees.repository";
import { generateEmployees } from "../seed/generate-employees";
import { listPay } from "./dashboard.repository";
import { groupBy, hiresByMonth, salaryBands, summarize } from "./summarize";

const BUDGET_MS = 50;
const today = "2026-10-13";
let db: Database;

beforeAll(() => {
  db = openDatabase(":memory:");
  replaceAllEmployees(db, generateEmployees(10_000, 42));
  db.run("ANALYZE");
});

// Everything the route computes on a cache miss (ADR-007), without HTTP.
function computeDashboard(filters: EmployeeFilters) {
  const rows = listPay(db, filters);
  return [
    summarize(rows, today),
    groupBy(rows, "country"),
    groupBy(rows, "department"),
    groupBy(rows, "jobTitle", "median"),
    salaryBands(rows.map((r) => r.usdCents)),
    hiresByMonth(rows, today),
  ];
}

// Median of 5 runs, so one GC pause doesn't fail the build.
function medianMs(filters: EmployeeFilters): number {
  const times = Array.from({ length: 5 }, () => {
    const start = performance.now();
    computeDashboard(filters);
    return performance.now() - start;
  }).sort((a, b) => a - b);
  return times[2] ?? Number.POSITIVE_INFINITY;
}

describe("dashboard with 10,000 employees, uncached", () => {
  it.each<[string, EmployeeFilters]>([
    ["no filters", {}],
    ["country", { country: "IN" }],
    ["department", { department: "Engineering" }],
    ["job title", { jobTitle: "Data Analyst" }],
    ["all three", { country: "IN", department: "Engineering", jobTitle: "Software Engineer" }],
  ])(`computes %s in under ${String(BUDGET_MS)} ms`, (_name, filters) => {
    expect(medianMs(filters)).toBeLessThan(BUDGET_MS);
  });
});
