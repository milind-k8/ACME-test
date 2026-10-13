import type { Database } from "bun:sqlite";
import type { Config } from "./config";
import { authRoutes } from "./auth/auth.routes";

export function createRoutes(db: Database, config: Config, now: () => Date = () => new Date()) {
  return { ...authRoutes(db, config, now) };
}
