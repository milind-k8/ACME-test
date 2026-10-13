export interface Config {
  port: number;
  databasePath: string;
  jwtSecret: string;
}

export function loadConfig(_env: Record<string, string | undefined>): Config {
  return { port: 0, databasePath: "", jwtSecret: "" };
}
