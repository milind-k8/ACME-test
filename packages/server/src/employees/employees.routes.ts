import type { Database } from "bun:sqlite";
import { API_ROUTES } from "@smt/shared/api-routes";
import { ERROR_CODES } from "@smt/shared/error-codes";
import type { Config } from "../config";
import { error, json } from "../http/responses";
import { withAuth } from "../http/with-auth";
import { EMPLOYEE_MESSAGES } from "./employees.constants";
import { createEmployee, getReferenceData, listEmployees, listFilterOptions } from "./employees.repository";
import { validateEmployee } from "./validate-employee";
import { validateListQuery } from "./validate-list-query";

// Membership sets for validation; read per request so a new migration's rows apply without a restart.
function referenceSets(db: Database) {
  const ref = getReferenceData(db);
  return {
    departments: new Set(ref.departments),
    countries: new Set(ref.countries.map((c) => c.code)),
    currencies: new Set(ref.currencies),
  };
}

export function employeeRoutes(db: Database, config: Config, now: () => Date) {
  return {
    [API_ROUTES.employees]: {
      GET: withAuth(config, now, (req) => {
        const query = validateListQuery(new URL(req.url).searchParams);
        if (!query.ok) return error(400, ERROR_CODES.validation, EMPLOYEE_MESSAGES.invalidListQuery, query.errors);
        return json(listEmployees(db, query.value));
      }),
      POST: withAuth(config, now, async (req) => {
        // Malformed JSON is a client error: validate it as an empty body so every field is reported.
        const body: unknown = await req.json().catch(() => null);
        const today = now().toISOString().slice(0, 10);
        const result = validateEmployee(body, referenceSets(db), today);
        if (!result.ok) return error(400, ERROR_CODES.validation, EMPLOYEE_MESSAGES.invalidEmployee, result.errors);
        return json(createEmployee(db, result.value), 201);
      }),
    },
    [API_ROUTES.employeeFilters]: {
      GET: withAuth(config, now, () => json(listFilterOptions(db))),
    },
    [API_ROUTES.employeeFormOptions]: {
      GET: withAuth(config, now, () => json(getReferenceData(db))),
    },
  };
}
