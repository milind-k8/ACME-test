import { ensureAdmin } from "./auth/admin";
import { loadConfig } from "./config";
import { openDatabase } from "./db/connection";
import { notFound, unexpected } from "./http/responses";
import { createRoutes } from "./routes";

const config = loadConfig(process.env);
const db = openDatabase(config.databasePath);
await ensureAdmin(db, config.adminEmail, config.adminPassword);

const server = Bun.serve({
  port: config.port,
  routes: createRoutes(db, config),
  fetch: notFound,
  error: unexpected,
});

console.log(`API listening on ${server.url.href}`);
