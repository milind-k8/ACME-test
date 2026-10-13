import type { Database } from "bun:sqlite";
import { API_ROUTES } from "@smt/shared/api-routes";
import type { Dashboard } from "@smt/shared/api-types";
import type { Config } from "../config";
import { json } from "../http/responses";
import { withAuth } from "../http/with-auth";
import { fxAsOf, listPay } from "./dashboard.repository";
import { groupBy, hiresByMonth, salaryBands, summarize } from "./summarize";

export function dashboardRoutes(db: Database, config: Config, now: () => Date) {
  return {
    [API_ROUTES.dashboard]: {
      GET: withAuth(config, now, () => {
        // Today on the server's (injectable) clock, in UTC.
        const today = now().toISOString().slice(0, 10);
        const rows = listPay(db);
        const dashboard: Dashboard = {
          fxAsOf: fxAsOf(db),
          summary: summarize(rows, today),
          byCountry: groupBy(rows, "country"),
          byDepartment: groupBy(rows, "department"),
          byJobTitle: groupBy(rows, "jobTitle", "median"),
          salaryBands: salaryBands(rows.map((r) => r.usdCents)),
          hiresByMonth: hiresByMonth(rows, today),
        };
        return json(dashboard);
      }),
    },
  };
}
