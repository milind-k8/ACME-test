import type { Database } from "bun:sqlite";
import { countEmployees, replaceAllEmployees } from "../employees/employees.repository";
import { generateEmployees } from "./generate-employees";
import { SEED_EMPLOYEE_COUNT, SEED_VALUE } from "./seed-data";

/** Seeds the demo employees only into an empty table. Returns whether it seeded. */
export function seedIfEmpty(db: Database): boolean {
  if (countEmployees(db) > 0) return false;
  replaceAllEmployees(db, generateEmployees(SEED_EMPLOYEE_COUNT, SEED_VALUE));
  // Fresh statistics so the query planner picks the right indexes.
  db.run("ANALYZE");
  return true;
}
