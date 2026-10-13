import { Database } from "bun:sqlite";
import { join } from "node:path";
import { migrate } from "./migrate";

export function openDatabase(path: string): Database {
  const db = new Database(path);
  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = NORMAL");
  db.run("PRAGMA busy_timeout = 5000");
  migrate(db, join(import.meta.dir, "migrations"));
  return db;
}
