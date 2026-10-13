import type { Database } from "bun:sqlite";
import type { Config } from "./config";
import { authRoutes } from "./auth/auth.routes";
import { dashboardRoutes } from "./dashboard/dashboard.routes";
import { employeeRoutes } from "./employees/employees.routes";

export function createRoutes(db: Database, config: Config, now: () => Date = () => new Date()) {
  return { ...authRoutes(db, config, now), ...employeeRoutes(db, config, now), ...dashboardRoutes(db, config, now) };
}
