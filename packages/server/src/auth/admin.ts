import type { Database } from "bun:sqlite";
import { upsertUser } from "./users.repository";
import { normalizeEmail } from "./validate-login";

export async function ensureAdmin(db: Database, email: string, password: string): Promise<void> {
  const passwordHash = await Bun.password.hash(password, { algorithm: "argon2id" });
  upsertUser(db, normalizeEmail(email), passwordHash);
}
