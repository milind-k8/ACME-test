import { loadConfig } from "../config";
import { openDatabase } from "../db/connection";
import { replaceAllEmployees } from "../employees/employees.repository";
import { generateEmployees } from "./generate-employees";

const EMPLOYEE_COUNT = 10_000;
const SEED = 42;

const config = loadConfig(process.env);
const db = openDatabase(config.databasePath);
replaceAllEmployees(db, generateEmployees(EMPLOYEE_COUNT, SEED));
// Fresh statistics so the query planner picks the right indexes.
db.run("ANALYZE");
db.close();
console.log(`Seeded ${String(EMPLOYEE_COUNT)} employees into ${config.databasePath}`);
