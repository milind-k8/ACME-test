# Backend

How to build the API, database, and seed. Read [development-process.md](development-process.md) first; this doc only adds what is specific to `packages/server/`. Why Bun and its built-ins: [ADR-001](adrs/001-bun-react-sqlite.md).

## Stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Runtime | Bun 1.4, TypeScript strict | Runs `.ts` directly |
| HTTP | `Bun.serve()` with `routes` | Path params, per-method handlers, `req.cookies`. No middleware chain: cross-cutting concerns are wrappers like `withAuth(handler)` |
| Database | `bun:sqlite` | Synchronous, no driver, no DB server. Single writer is fine for one user |
| Data access | Plain SQL, prepared statements | One repository per feature. No ORM |
| Validation | Hand-written `validateEmployee()` | Returns per-field errors. The server is the authority |
| Auth | `jose` (JWT HS256) + `Bun.password` (argon2id) | Details in [ADR-003](adrs/003-stateless-jwt-auth.md) |
| Seed | Fixed lists + seeded PRNG, no faker | Identical data on every run |

**Allowed runtime dependencies:** `jose`, `@sentry/bun` ([ADR-004](adrs/004-sentry-error-monitoring.md)). Anything else needs a line in the plan.

## Architecture

A light MVC shape. Onion/hexagonal would be overkill without complex domain rules.

- **Route handlers** (`*.routes.ts`): parse the request, validate, call the domain or repository, return `json(...)`. No SQL and no business rules.
- **Pure functions** (`validate-*`, `median`, `generate-*`): no I/O. These hold the rules worth unit testing.
- **Repositories** (`*.repository.ts`): the only place that touches SQL. Functions take `db` as their first argument. Rows map to `shared` types here.
- No DI container. `db` is passed in as a plain argument, so tests can hand in `:memory:`.
- `index.ts` and `routes.ts` are wiring only. If something there needs a test, it belongs somewhere else.

## Folder layout

```
packages/server/
├── package.json, tsconfig.json, Dockerfile
└── src/
    ├── index.ts                entry point: Bun.serve({ routes, development }) — wiring only
    ├── routes.ts               createRoutes(db, config): merges every feature's routes
    ├── config.ts               reads + validates env vars once (fails fast if JWT_SECRET is missing)
    ├── http/
    │   ├── responses.ts        json(), error(), notFound(), unexpected(err): the single error shape
    │   └── with-auth.ts        withAuth(handler): verifies the JWT cookie, then calls the handler
    ├── db/
    │   ├── connection.ts       openDatabase(path) → runs migrations; ':memory:' in tests
    │   ├── migrate.ts          applies migrations/*.sql in order, tracks them in schema_migrations
    │   └── migrations/         001_users.sql, 002_employees_fx.sql, …
    ├── auth/
    │   ├── auth.routes.ts      POST /login, POST /logout, GET /me
    │   ├── token.ts            signToken / verifyToken (jose)
    │   └── users.repository.ts findByEmail, createUser
    ├── employees/
    │   ├── employees.routes.ts
    │   ├── employees.repository.ts   list(filters), get, create, update, remove
    │   └── validate-employee.ts      pure: input → { ok, value } | { ok: false, errors }
    ├── insights/
    │   ├── insights.routes.ts
    │   ├── insights.repository.ts    aggregate SQL (GROUP BY, USD conversion join)
    │   └── median.ts                 pure
    ├── seed/
    │   ├── generate-employees.ts     pure + deterministic: (count, seed) → employees[]
    │   ├── random.ts                 seeded PRNG
    │   ├── data.ts                   name / title / department / country lists, FX snapshot
    │   └── seed.ts                   CLI: open DB, wipe, insert in one transaction
    └── test-support/
        └── test-server.ts            startTestServer() → { url, db, loginCookie, stop }
```

The tree is the target; folders appear when the first file needs them. A feature folder past about 8 files gets subfolders (`employees/import/`), not a split across layers.

## Import rules

Enforced by ESLint `no-restricted-imports`.

| Code in… | May import | Must NOT import |
|----------|-----------|-----------------|
| `*.repository.ts` | `bun:sqlite`, `shared/` | routes, `http/`, `web/` |
| Pure files | `shared/` | the DB, `http/`, `Bun.*` |
| `*.routes.ts` | its own feature's files, `http/`, `shared/` | another feature's repository (use that feature's exported functions) |
| anything in `server/` | — | `web/` |

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| TS files | kebab-case, feature-prefixed when it helps | `employees.repository.ts`, `with-auth.ts` |
| Migrations | `NNN_description.sql`, never edited after commit | `003_add_employee_email.sql` |

## Database

- **Schema changes** are new numbered migration files, run at startup. Never edit an old one. The plan lists the migrations each slice adds.
- **Money columns**: `salary_minor INTEGER` + `currency` with a foreign key to `fx_rates`.
- **Every table is `STRICT`.** By default SQLite stores whatever you give it (the string `"abc"` in an `INTEGER` column is accepted). `STRICT` rejects a wrong type with an error, so a bug can't quietly write a float or a string into `salary_minor`.
  - Allowed column types are `INTEGER`, `REAL`, `TEXT`, `BLOB`. SQLite's `ANY` column type is not used, for the same reason as no `any` in TypeScript. Dates are `TEXT` (ISO 8601). Booleans are `INTEGER` with `CHECK (col IN (0, 1))`.
  - Virtual tables (`employees_fts`) can't be `STRICT`. They only hold copies of `TEXT` columns, so nothing is lost.
- **Constraints are the last line of defence.** `validate-employee.ts` gives the user friendly errors; the schema guarantees the data even if a bug skips validation. Columns are `NOT NULL` unless null has a meaning, and rules that must never break are `CHECK`s:

```sql
CREATE TABLE employees (
  id            INTEGER PRIMARY KEY,
  first_name    TEXT    NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name     TEXT    NOT NULL CHECK (length(trim(last_name)) > 0),
  salary_minor  INTEGER NOT NULL CHECK (salary_minor > 0),
  currency      TEXT    NOT NULL REFERENCES fx_rates(currency),
  hired_at      TEXT    NOT NULL CHECK (date(hired_at) = hired_at),  -- valid YYYY-MM-DD
  ...
) STRICT;
```

(Indicative; the real columns come from the employees plan.) `STRICT` needs SQLite 3.37+. Bun bundles a newer SQLite on Linux (Docker), and on macOS it uses the system SQLite, which is newer on any current macOS. Check it with `select sqlite_version()` during the walking skeleton, along with FTS5.

## Error handling

The response shape is in [development-process.md](development-process.md#cross-cutting-conventions). On the server:

- **Expected errors are returned, not thrown.** Validation (`400`), auth (`401`), and not found (`404`) are normal responses built with `error()` / `notFound()`. They are not logged as errors and not sent to Sentry.
- **Unexpected errors are thrown and caught in one place.** Handlers don't wrap code in `try/catch` just to log it. `Bun.serve`'s `error` option calls `unexpected(err)`, which logs the error, reports it to Sentry, and returns `500` with a generic message. Stack traces and SQL never reach the client.
- **Only catch what you can handle.** A `try/catch` in a handler is for mapping a known failure to a response (e.g. a foreign-key failure on `currency` → `400`). Anything else is re-thrown.
- **Startup fails fast.** `config.ts` throws on missing or invalid env vars before the server listens.
- **Sentry in production only.** `Sentry.init` runs in `index.ts` only when `SENTRY_DSN` is set, so dev and tests never make network calls. No salary data leaves the server: `sendDefaultPii: false`, and request bodies are not attached to events.

## Testing

- **Unit** (`*.test.ts` next to pure files): validation, money, median, seed determinism.
- **Integration** (`*.routes.test.ts`): `startTestServer()` starts `Bun.serve` on port 0 with `:memory:` SQLite and calls it with `fetch`. Covers route + repository + SQL together. CRUD endpoints may start here, since their job is wiring.
- **Schema:** one repository test per table proves a wrong type or a broken `CHECK` is rejected (e.g. inserting `salary_minor = 12.5` throws).
- **Query plans:** hot queries assert `EXPLAIN QUERY PLAN` shows no `SCAN employees` (see Query performance).
- **Errors:** a route that throws returns `500` with the generic message and no stack trace.
- Helpers live in `server/test-support/` and are never imported by production code.

## Adding a backend slice

1. Types are already in `shared/api-types.ts` (contract first).
2. Pure functions and their tests, then the repository (integration-tested), then routes (integration-tested). Register in `routes.ts`.
3. Schema change → new numbered migration.
4. List the files in the plan's "As built".

## Query performance

Target: every list, search, and insight query under 50 ms at 10k rows. The rules below keep it there without guessing.

### Connection settings

Set once in `connection.ts`, right after opening:

| PRAGMA | Why |
|--------|-----|
| `foreign_keys = ON` | **Off by default in SQLite.** Without it, the `currency → fx_rates` constraint from ADR-002 is silently ignored |
| `journal_mode = WAL` | Reads don't block the writer, and vice versa |
| `synchronous = NORMAL` | Safe with WAL, and much faster writes than `FULL` |
| `busy_timeout = 5000` | Wait instead of failing immediately with `SQLITE_BUSY` |

Run `ANALYZE` after the seed, and `PRAGMA optimize` on shutdown, so the query planner has up-to-date statistics.

### Indexes

Index the columns that queries filter, sort, or join on, and nothing else. Every index costs write time and space.

| Index | Serves |
|-------|--------|
| `employees(country, job_title)` | Filter by country; insights per country and per title within a country |
| `employees(department)` | Filter by department; headcount by department |
| `employees(job_title)` | Filter by title; comparing one title across countries |
| `employees_fts` (see Search) | Name search |

- **Composite order:** equality columns first, then the sort or range column. `(country, job_title)` also serves `WHERE country = ?` alone, so there's no separate `country` index.
- Indexes are added in migrations, in the same slice as the query that needs them.
- **Verify with `EXPLAIN QUERY PLAN`.** The output should say `SEARCH employees USING INDEX …`, not `SCAN employees`. The hot queries (list with each filter, search, and insights) get a test that asserts no full scan. It's deterministic, unlike a timing test.

### Search

Name search uses **SQLite FTS5**, which is built into SQLite, so no dependency is added:

- A `employees_fts` virtual table over `first_name` and `last_name` (`content='employees'`), kept in sync by `AFTER INSERT/UPDATE/DELETE` triggers in the same migration.
- Tokenizer `unicode61 remove_diacritics 2`: case-insensitive, and accent-insensitive (`jose` finds `José`), which matters for names across countries.
- Each search word becomes a prefix query, so `kri sha` matches `Krishna Sharma`. Results are ordered by `bm25()` relevance.
- User input is never put into the `MATCH` string as-is. Each word is quoted (`"kri"*`), so FTS syntax characters can't break the query.
- Search combines with filters: `JOIN employees_fts … WHERE employees_fts MATCH ? AND country = ?`.
- **Typo-tolerant search** (`krisna` → `Krishna`) isn't built in. It needs the `spellfix1` extension or trigram scoring. Add it only if HR asks; prefix search covers someone who knows the name.
- Verify FTS5 is compiled into `bun:sqlite` on both macOS and the Docker image (a one-line check during the walking skeleton).

### Writing queries

- **Filter, sort, paginate, and aggregate in SQL.** The API never returns all 10,000 rows, and JS never filters rows that SQL could.
- **Never query in a loop** (N+1). One query per list or insight, with a `JOIN` or `GROUP BY` instead.
- **Select only the columns you need**, not `SELECT *`.
- **Sort columns come from a whitelist.** Column names can't be bound as parameters, so `?sort=` maps to a fixed set (`name`, `salary`, `hired_at`, …). Anything else is a `400`. Never interpolate user input into SQL.
- **Salary sorts by its USD value**, because stored amounts are in different currencies (¥6,500,000 must not rank above $150,000). The sort expression is `salary_minor * fx_rates.usd_cents_per_minor` via the `fx_rates` join, with `id` as a tie-breaker so pages are stable. This can't use an index; sorting 10k rows in memory takes about a millisecond.
- **Pagination:** `LIMIT ? OFFSET ?`, plus the total via `COUNT(*) OVER()` in the same query. That's fine at 10k rows. Switch to keyset pagination (`WHERE (sort_col, id) > (?, ?)`) only if deep pages get slow.
- **Use `db.query()`**, which caches the compiled statement, for anything run more than once.
- **Batch writes in one transaction** (`db.transaction()`). The seed inserts 10,000 rows this way in a few milliseconds.

### Aggregates and median

- `MIN`, `MAX`, `AVG`, `COUNT`, and `GROUP BY` run in SQL, with USD conversion as a join to `fx_rates`.
- SQLite has no median function, so the repository returns USD values sorted per group, and `median.ts` picks the middle value. That's well under 10 ms at this size.
- If the data grows to millions of rows, precompute the stats rather than computing them per request.

If SQLite is outgrown, only `*.repository.ts` and `db/` touch the database.
---
- [ ] Reviewed
