import { describe, expect, it } from "bun:test";
import { openDatabase } from "./connection";

describe("openDatabase", () => {
  it("turns on foreign key enforcement", () => {
    const db = openDatabase(":memory:");
    expect(db.query("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
  });

  it("applies the bundled migrations", () => {
    const db = openDatabase(":memory:");
    expect(db.query("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'users'").get()).toEqual({ name: "users" });
  });

  it("runs on a SQLite with STRICT tables (3.37+) and FTS5", () => {
    const db = openDatabase(":memory:");
    const { version } = db.query<{ version: string }, []>("SELECT sqlite_version() AS version").get() ?? { version: "0" };
    const [major = 0, minor = 0] = version.split(".").map(Number);
    expect(major * 1000 + minor).toBeGreaterThanOrEqual(3037);
    expect(db.query("SELECT sqlite_compileoption_used('ENABLE_FTS5') AS fts5").get()).toEqual({ fts5: 1 });
  });
});
