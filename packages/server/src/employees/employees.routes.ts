import type { Database } from "bun:sqlite";
import { API_ROUTES } from "@smt/shared/api-routes";
import type { Config } from "../config";
import { json } from "../http/responses";
import { withAuth } from "../http/with-auth";
import { listEmployees } from "./employees.repository";

export function employeeRoutes(db: Database, config: Config, now: () => Date) {
  return {
    [API_ROUTES.employees]: {
      GET: withAuth(config, now, () => json(listEmployees(db, { page: 1, pageSize: 50 }))),
    },
  };
}
