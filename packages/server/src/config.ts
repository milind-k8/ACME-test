export interface Config {
  port: number;
  databasePath: string;
  jwtSecret: string;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret && env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is required in production");
  }
  return { port: 0, databasePath: "", jwtSecret: jwtSecret ?? "" };
}
