export interface Config {
  port: number;
  databasePath: string;
  jwtSecret: string;
  adminEmail: string;
  adminPassword: string;
  /** Seed the demo employees at startup when the table is empty. Off unless SEED_IF_EMPTY=true. */
  seedIfEmpty: boolean;
  /** Read the client address from X-Forwarded-For; only true behind our own proxy (Compose). */
  trustProxy: boolean;
}

type Env = Record<string, string | undefined>;

function booleanFlag(env: Env, name: string): boolean {
  const value = env[name];
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  throw new Error(`${name} must be true or false`);
}

function required(env: Env, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function loadConfig(env: Env): Config {
  const jwtSecret = required(env, "JWT_SECRET");
  const adminEmail = required(env, "ADMIN_EMAIL");
  const adminPassword = required(env, "ADMIN_PASSWORD");
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  const seedIfEmpty = booleanFlag(env, "SEED_IF_EMPTY");
  const trustProxy = booleanFlag(env, "TRUST_PROXY");
  return {
    port,
    databasePath: env.DATABASE_PATH ?? "smt.db",
    jwtSecret,
    adminEmail,
    adminPassword,
    seedIfEmpty,
    trustProxy,
  };
}
