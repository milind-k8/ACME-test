# Plan: Seed an empty database on boot
Spec: [03-seed-on-boot-spec.md](../specs/03-seed-on-boot-spec.md)

## Slice 1: The API seeds an empty database when asked to

- **Design intent:** one function decides and seeds; `index.ts` and `seed.ts` both use the same count and seed value, so boot and `bun run seed` produce identical data.
- **API contract:** none.
- **Backend:**
  - `config.ts`: `seedIfEmpty: boolean` from `SEED_IF_EMPTY` (`"true"` / `"false"` / unset = false; anything else throws).
  - `seed/seed-data.ts`: `SEED_EMPLOYEE_COUNT = 10_000`, `SEED_VALUE = 42` (moved out of `seed.ts`, so both entry points share them).
  - `seed/seed-if-empty.ts`: `seedIfEmpty(db): boolean`. Counts employees; if zero, `replaceAllEmployees(db, generateEmployees(SEED_EMPLOYEE_COUNT, SEED_VALUE))` and `ANALYZE`, returns `true`.
  - `employees/employees.repository.ts`: `countEmployees(db): number`.
  - `index.ts` (wiring): `if (config.seedIfEmpty && seedIfEmpty(db)) console.log("Seeded 10000 employees into an empty database")`.
- **Wiring:** `docker-compose.yml` → `api.environment.SEED_IF_EMPTY: "true"`. `devops.md` env table gets the variable; the first-boot sentence loses "(once those slices exist)".
- **Frontend:** none.
- **Libraries added:** none.
- **Test list:**
  - [x] unit `config`: `SEED_IF_EMPTY` unset → false · `"true"` → true · `"false"` → false · `"yes"` → throws naming the variable
  - [x] integration `seed-if-empty`: empty DB → 10,000 employees, returns true, rows equal `generateEmployees(10_000, 42)` · one existing employee → still exactly one, returns false
  - [x] manual: `docker compose down -v && docker compose up --build` → log shows the seed line → login shows 10,000
- **Quality checks:** the seed runs inside one transaction (via `replaceAllEmployees`) · no demo data without the flag

## As built

Built on branch `feat/seed-on-boot`. `bun run check` passes with 160 server and 44 web tests.

**Files:** `config.ts` (`seedIfEmpty`, `booleanFlag`), `seed/seed-data.ts`, `seed/seed-if-empty.ts`, `employees.repository.ts` (`countEmployees`), `seed/seed.ts` and `index.ts` (wiring), `test-support/test-server.ts` (`seedIfEmpty: false`), `docker-compose.yml`, `devops.md`.

**Differences from the plan:** none in code. The manual Docker check ran under a separate Compose project (`-p smt-bootcheck`), so the fresh volume it needed never touched the existing `smt_data` volume; that project and its volume were removed afterwards. A restart of the same container did not seed again.

**Also changed:** the employee list spec's out-of-scope lines now name the CRUD and insights specs instead of numbering them, since this spec took number 03.

---
- [x] Reviewed
