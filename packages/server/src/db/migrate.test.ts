import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "./migrate";

let dir: string;
let db: Database;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "smt-migrations-"));
  db = new Database(":memory:");
});

afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true });
});

function appliedNames(): string[] {
  return db.query<{ name: string }, []>("SELECT name FROM schema_migrations ORDER BY name").all().map((r) => r.name);
}

describe("migrate", () => {
  it("applies .sql files in name order and records each one", () => {
    writeFileSync(join(dir, "002_add_b.sql"), "ALTER TABLE a ADD COLUMN b TEXT;");
    writeFileSync(join(dir, "001_create_a.sql"), "CREATE TABLE a (id INTEGER PRIMARY KEY) STRICT;");

    migrate(db, dir);

    const columns = db.query<{ name: string }, []>("SELECT name FROM pragma_table_info('a')").all();
    expect(columns.map((c) => c.name)).toEqual(["id", "b"]);
    expect(appliedNames()).toEqual(["001_create_a.sql", "002_add_b.sql"]);
  });

  it("skips migrations that were already applied", () => {
    writeFileSync(join(dir, "001_create_a.sql"), "CREATE TABLE a (id INTEGER PRIMARY KEY) STRICT;");
    migrate(db, dir);
    writeFileSync(join(dir, "002_create_b.sql"), "CREATE TABLE b (id INTEGER PRIMARY KEY) STRICT;");

    migrate(db, dir);

    expect(appliedNames()).toEqual(["001_create_a.sql", "002_create_b.sql"]);
  });

  it("applies every statement in a file", () => {
    writeFileSync(join(dir, "001_two_tables.sql"), "CREATE TABLE a (id INTEGER PRIMARY KEY) STRICT;\nCREATE TABLE b (id INTEGER PRIMARY KEY) STRICT;");

    migrate(db, dir);

    const tables = db.query<{ name: string }, []>("SELECT name FROM sqlite_schema WHERE name IN ('a', 'b') ORDER BY name").all();
    expect(tables.map((t) => t.name)).toEqual(["a", "b"]);
  });

  it("leaves no partial changes when a migration fails", () => {
    writeFileSync(join(dir, "001_half_broken.sql"), "CREATE TABLE a (id INTEGER PRIMARY KEY) STRICT;\nINSERT INTO missing VALUES (1);");

    expect(() => { migrate(db, dir); }).toThrow("no such table: missing");

    expect(db.query("SELECT name FROM sqlite_schema WHERE name = 'a'").get()).toBeNull();
    expect(appliedNames()).toEqual([]);
  });
});
