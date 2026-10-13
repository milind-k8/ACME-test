import type { Database } from "bun:sqlite";

/**
 * Runs `use` against a recording copy of `db`, then asks SQLite how it would run each statement `use` executed,
 * with the same parameters. Returns every plan line, e.g. "SEARCH e USING INDEX employees_department (department=?)".
 */
export function queryPlans(db: Database, use: (db: Database) => unknown): string[] {
  const statements: { sql: string; params: unknown[] }[] = [];
  const recording = new Proxy(db, {
    get(target, key) {
      if (key !== "query") return Reflect.get(target, key) as unknown;
      return (sql: string) => {
        const statement = target.query(sql);
        const record = (params: unknown[]) => statements.push({ sql, params });
        return {
          all: (...params: unknown[]) => (record(params), statement.all(...(params as []))),
          get: (...params: unknown[]) => (record(params), statement.get(...(params as []))),
        };
      };
    },
  });
  use(recording);
  return statements.flatMap(({ sql, params }) =>
    db
      .query<{ detail: string }, []>(`EXPLAIN QUERY PLAN ${sql}`)
      .all(...(params as []))
      .map((row) => row.detail),
  );
}

/** Plan lines that read the whole employees table (aliased "e" or not); "SCAN employees_fts" is the search index. */
export const fullScans = (plans: string[]) => plans.filter((detail) => /^SCAN (employees|e)( |$)/.test(detail));
