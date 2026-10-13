import type { Database } from "bun:sqlite";
import { API_ROUTES } from "@smt/shared/api-routes";
import { EMPLOYEE_FILTERS, type Dashboard, type EmployeeFilters } from "@smt/shared/api-types";
import type { Config } from "../config";
import { json } from "../http/responses";
import { withAuth } from "../http/with-auth";
import { dataVersion, fxAsOf, listPay } from "./dashboard.repository";
import { createResponseCache } from "./response-cache";
import { groupBy, hiresByMonth, salaryBands, summarize } from "./summarize";

/** The three filters from the query string, trimmed; blank means "no filter". */
function parseFilters(params: URLSearchParams): EmployeeFilters {
  const filters: EmployeeFilters = {};
  for (const name of EMPLOYEE_FILTERS) {
    const value = params.get(name)?.trim();
    if (value) filters[name] = value;
  }
  return filters;
}

const MAX_CACHED_RESPONSES = 100;

export function dashboardRoutes(db: Database, config: Config, now: () => Date) {
  // One cache per route table, so every test server starts empty (ADR-008).
  const cache = createResponseCache<Dashboard>(MAX_CACHED_RESPONSES);

  return {
    [API_ROUTES.dashboard]: {
      GET: withAuth(config, now, (req) => {
        // Today on the server's (injectable) clock, in UTC. Part of the key: hires and tenure change at midnight.
        const today = now().toISOString().slice(0, 10);
        const filters = parseFilters(new URL(req.url).searchParams);
        const key = `${today}|${EMPLOYEE_FILTERS.map((name) => filters[name] ?? "").join("|")}`;
        // Read the version BEFORE the query: a write in between then files these figures under the older version,
        // and the next request recomputes. Reading it after could store pre-write figures as current.
        const version = dataVersion(db);
        const cached = cache.get(version, key);
        if (cached) return json(cached);

        const rows = listPay(db, filters);
        const dashboard: Dashboard = {
          fxAsOf: fxAsOf(db),
          summary: summarize(rows, today),
          byCountry: groupBy(rows, "country"),
          byDepartment: groupBy(rows, "department"),
          byJobTitle: groupBy(rows, "jobTitle", "median"),
          salaryBands: salaryBands(rows.map((r) => r.usdCents)),
          hiresByMonth: hiresByMonth(rows, today),
        };
        cache.set(version, key, dashboard);
        return json(dashboard);
      }),
    },
  };
}
