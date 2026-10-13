import { loadConfig } from "./config";

const config = loadConfig(process.env);

const server = Bun.serve({
  port: config.port,
  routes: {},
  fetch: () => Response.json({ error: { code: "not_found", message: "Not found" } }, { status: 404 }),
});

console.log(`API listening on ${server.url.href}`);
