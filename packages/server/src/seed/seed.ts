import { loadConfig } from "../config";
import { openDatabase } from "../db/connection";
import { replaceAllEmployees } from "../employees/employees.repository";
import { generateEmployees } from "./generate-employees";
import { SEED_EMPLOYEE_COUNT, SEED_VALUE } from "./seed-data";

const config = loadConfig(process.env);
const db = openDatabase(config.databasePath);
replaceAllEmployees(db, generateEmployees(SEED_EMPLOYEE_COUNT, SEED_VALUE));
// Fresh statistics so the query planner picks the right indexes.
db.run("ANALYZE");
db.close();
console.log(`Seeded ${String(SEED_EMPLOYEE_COUNT)} employees into ${config.databasePath}`);
