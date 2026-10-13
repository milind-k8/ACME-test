import { ensureAdmin } from "./auth/admin";
import { loadConfig } from "./config";
import { openDatabase } from "./db/connection";
import { notFound, unexpected } from "./http/responses";
import { createRoutes } from "./routes";
import { SEED_EMPLOYEE_COUNT } from "./seed/seed-data";
import { seedIfEmpty } from "./seed/seed-if-empty";

const config = loadConfig(process.env);
const db = openDatabase(config.databasePath);
await ensureAdmin(db, config.adminEmail, config.adminPassword);
if (config.seedIfEmpty && seedIfEmpty(db)) {
  console.log(`Seeded ${String(SEED_EMPLOYEE_COUNT)} employees into an empty database`);
}

const server = Bun.serve({
  port: config.port,
  routes: createRoutes(db, config),
  fetch: notFound,
  error: unexpected,
});

console.log(`API listening on ${server.url.href}`);
