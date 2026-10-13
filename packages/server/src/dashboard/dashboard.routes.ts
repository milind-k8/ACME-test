import type { Database } from "bun:sqlite";
import { API_ROUTES } from "@smt/shared/api-routes";
import type { Dashboard } from "@smt/shared/api-types";
import type { Config } from "../config";
import { json } from "../http/responses";
import { withAuth } from "../http/with-auth";
import { fxAsOf, listPay } from "./dashboard.repository";
import { summarize } from "./summarize";

export function dashboardRoutes(db: Database, config: Config, now: () => Date) {
  return {
    [API_ROUTES.dashboard]: {
      GET: withAuth(config, now, () => {
        // Today on the server's (injectable) clock, in UTC.
        const today = now().toISOString().slice(0, 10);
        const dashboard: Dashboard = { fxAsOf: fxAsOf(db), summary: summarize(listPay(db), today) };
        return json(dashboard);
      }),
    },
  };
}
