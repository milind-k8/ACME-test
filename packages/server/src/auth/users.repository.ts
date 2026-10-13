import type { Database } from "bun:sqlite";

export interface UserRecord {
  id: number;
  email: string;
  passwordHash: string;
}

export function upsertUser(db: Database, email: string, passwordHash: string): void {
  db.query(
    "INSERT INTO users (email, password_hash) VALUES (?, ?) ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash",
  ).run(email, passwordHash);
}

export function findByEmail(db: Database, email: string): UserRecord | null {
  return db
    .query<UserRecord, [string]>("SELECT id, email, password_hash AS passwordHash FROM users WHERE email = ?")
    .get(email);
}
