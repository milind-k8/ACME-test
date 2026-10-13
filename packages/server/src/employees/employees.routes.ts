import type { Database } from "bun:sqlite";
import type { BunRequest } from "bun";
import { API_ROUTES } from "@smt/shared/api-routes";
import { ERROR_CODES } from "@smt/shared/error-codes";
import type { Config } from "../config";
import { error, json, notFound } from "../http/responses";
import { withAuth } from "../http/with-auth";
import { EMPLOYEE_MESSAGES } from "./employees.constants";
import {
  createEmployee,
  getReferenceData,
  listEmployees,
  listFilterOptions,
  updateEmployee,
} from "./employees.repository";
import { parseId, validateEmployee } from "./validate-employee";
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

async function validateBody(req: Request, db: Database, now: () => Date) {
  // Malformed JSON is a client error: validate it as an empty body so every field is reported.
  const body: unknown = await req.json().catch(() => null);
  // Today on the server's (injectable) clock, in UTC.
  return validateEmployee(body, referenceSets(db), now().toISOString().slice(0, 10));
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
        const result = await validateBody(req, db, now);
        if (!result.ok) return error(400, ERROR_CODES.validation, EMPLOYEE_MESSAGES.invalidEmployee, result.errors);
        return json(createEmployee(db, result.value), 201);
      }),
    },
    [API_ROUTES.employeeFilters]: {
      GET: withAuth(config, now, () => json(listFilterOptions(db))),
    },
    [API_ROUTES.employee]: {
      PUT: withAuth(config, now, async (req: BunRequest<typeof API_ROUTES.employee>) => {
        const id = parseId(req.params.id);
        if (id === null) return notFound();
        const result = await validateBody(req, db, now);
        if (!result.ok) return error(400, ERROR_CODES.validation, EMPLOYEE_MESSAGES.invalidEmployee, result.errors);
        const updated = updateEmployee(db, id, result.value);
        return updated ? json(updated) : notFound();
      }),
    },
    [API_ROUTES.employeeFormOptions]: {
      GET: withAuth(config, now, () => json(getReferenceData(db))),
    },
  };
}
