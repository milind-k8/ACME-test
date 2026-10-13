import type { Config } from "../config";
import { openDatabase } from "../db/connection";
import { signToken } from "../auth/token";
import { upsertUser } from "../auth/users.repository";
import { notFound, unexpected } from "../http/responses";
import { createRoutes } from "../routes";

export const TEST_ADMIN = { email: "hr@acme.test", password: "demo-password" };

export const TEST_CONFIG: Config = {
  port: 0,
  databasePath: ":memory:",
  jwtSecret: "test-secret",
  adminEmail: TEST_ADMIN.email,
  adminPassword: TEST_ADMIN.password,
  seedIfEmpty: false,
};

// argon2id is slow on purpose (~100 ms), so hash once per test process instead of once per server.
const adminHash = await Bun.password.hash(TEST_ADMIN.password, { algorithm: "argon2id" });

// databasePath: a temp file when a test needs a second connection to the same database; ":memory:" otherwise.
export async function startTestServer(options: { now?: () => Date; databasePath?: string } = {}) {
  const now = options.now ?? (() => new Date());
  const db = openDatabase(options.databasePath ?? ":memory:");
  upsertUser(db, TEST_ADMIN.email, adminHash);
  const server = Bun.serve({
    port: 0,
    routes: createRoutes(db, TEST_CONFIG, now),
    fetch: notFound,
    error: unexpected,
  });
  return {
    url: server.url.href.replace(/\/$/, ""),
    db,
    loginCookie: `session=${await signToken({ email: TEST_ADMIN.email }, TEST_CONFIG.jwtSecret, now())}`,
    stop: () => server.stop(true),
  };
}
