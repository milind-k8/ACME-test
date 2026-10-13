import { beforeAll, describe, expect, it } from "bun:test";
import type { Database } from "bun:sqlite";
import { openDatabase } from "../db/connection";
import { generateEmployees } from "../seed/generate-employees";
import { listEmployees, replaceAllEmployees } from "./employees.repository";
import type { EmployeeListQuery } from "./validate-list-query";

const BUDGET_MS = 50;
let db: Database;

beforeAll(() => {
  db = openDatabase(":memory:");
  replaceAllEmployees(db, generateEmployees(10_000, 42));
  db.run("ANALYZE");
});

// Median of 5 runs, so one GC pause or busy CI moment doesn't fail the build.
function medianMs(query: EmployeeListQuery): number {
  const times = Array.from({ length: 5 }, () => {
    const start = performance.now();
    listEmployees(db, query);
    return performance.now() - start;
  }).sort((a, b) => a - b);
  return times[2] ?? Number.POSITIVE_INFINITY;
}

const base = { page: 1, pageSize: 50 };

describe("listEmployees with 10,000 employees", () => {
  it.each<[string, EmployeeListQuery]>([
    ["no filters", base],
    ["a deep page", { ...base, page: 150 }],
    ["country", { ...base, country: "IN" }],
    ["department", { ...base, department: "Engineering" }],
    ["job title", { ...base, jobTitle: "Data Analyst" }],
    ["all filters", { ...base, country: "IN", department: "Engineering", jobTitle: "Software Engineer" }],
    ["search", { ...base, q: "sha" }],
    ["search + country", { ...base, q: "kri sha", country: "IN" }],
    ["sort by salary", { ...base, sort: "salary", order: "desc" }],
    ["sort by hire date", { ...base, sort: "hiredAt" }],
    ["sort by salary + filter", { ...base, country: "DE", sort: "salary" }],
    ["search + sort by salary", { ...base, q: "a", sort: "salary" }],
    ["everything", { ...base, q: "sharma", country: "IN", department: "Engineering", sort: "salary", order: "desc" }],
  ])(`answers %s in under ${String(BUDGET_MS)} ms`, (_name, query) => {
    expect(medianMs(query)).toBeLessThan(BUDGET_MS);
  });
});
