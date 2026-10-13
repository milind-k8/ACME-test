import type { Database } from "bun:sqlite";
import { API_ROUTES } from "@smt/shared/api-routes";
import { ERROR_CODES } from "@smt/shared/error-codes";
import type { Config } from "../config";
import { error, json } from "../http/responses";
import { withAuth } from "../http/with-auth";
import { EMPLOYEE_MESSAGES } from "./employees.constants";
import { listEmployees, listFilterOptions } from "./employees.repository";
import { validateListQuery } from "./validate-list-query";

export function employeeRoutes(db: Database, config: Config, now: () => Date) {
  return {
    [API_ROUTES.employees]: {
      GET: withAuth(config, now, (req) => {
        const query = validateListQuery(new URL(req.url).searchParams);
        if (!query.ok) return error(400, ERROR_CODES.validation, EMPLOYEE_MESSAGES.invalidListQuery, query.errors);
        return json(listEmployees(db, query.value));
      }),
    },
    [API_ROUTES.employeeFilters]: {
      GET: withAuth(config, now, () => json(listFilterOptions(db))),
    },
  };
}
