export interface Config {
  port: number;
  databasePath: string;
  jwtSecret: string;
  adminEmail: string;
  adminPassword: string;
}

type Env = Record<string, string | undefined>;

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
  return { port, databasePath: env.DATABASE_PATH ?? "smt.db", jwtSecret, adminEmail, adminPassword };
}
