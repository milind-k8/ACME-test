import type { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function migrate(db: Database, dir: string): void {
  db.run("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY) STRICT");
  const applied = new Set(db.query<{ name: string }, []>("SELECT name FROM schema_migrations").all().map((r) => r.name));
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !applied.has(f))
    .sort();
  const apply = db.transaction((name: string) => {
    db.run(readFileSync(join(dir, name), "utf8"));
    db.run("INSERT INTO schema_migrations (name) VALUES (?)", [name]);
  });
  for (const name of files) {
    apply(name);
  }
}
