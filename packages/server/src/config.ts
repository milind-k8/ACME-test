export interface Config {
  port: number;
  jwtSecret: string;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret && env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return { port, jwtSecret: jwtSecret ?? "" };
}
