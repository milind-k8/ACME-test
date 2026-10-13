# Plan: Employee list
Spec: [02-employee-list-spec.md](../specs/02-employee-list-spec.md) · Decisions: [ADR-002](../adrs/002-salary-currency-and-usd-reporting.md)

The seed is part of Slice 1: it's the only way rows get into the database until spec 03.

## Slice 1: HR sees the first page of employees (walking skeleton)

- **Design intent:** schema, FX snapshot, deterministic seed, and the thinnest `GET /api/employees` (first 50, default sort) rendered as a table. Fixes the money and currency rules in the schema before anything else builds on them.
- **API contract:**
  - `shared/api-routes.ts`: `employees: "/api/employees"`
  - `shared/api-types.ts`:
    ```ts
    export interface Employee {
      id: number;
      employeeNumber: string;  // "E00001"
      firstName: string;
      lastName: string;
      jobTitle: string;
      department: string;
      country: string;         // ISO 3166 alpha-2
      salaryMinor: number;     // integer, minor units of `currency`
      currency: string;        // ISO 4217
      hiredAt: string;         // YYYY-MM-DD
    }
    export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }
    ```
- **Backend:**
  - Migration `db/migrations/002_employees.sql`:
    ```sql
    CREATE TABLE fx_rates (
      currency            TEXT PRIMARY KEY CHECK (length(currency) = 3 AND currency = upper(currency)),
      usd_cents_per_minor REAL NOT NULL CHECK (usd_cents_per_minor > 0),
      as_of               TEXT NOT NULL CHECK (date(as_of) = as_of)
    ) STRICT;

    INSERT INTO fx_rates (currency, usd_cents_per_minor, as_of) VALUES
      ('USD', 1.0, '2026-10-01'), ('EUR', ..., '2026-10-01'), ...;  -- one row per seeded currency

    CREATE TABLE employees (
      id              INTEGER PRIMARY KEY,
      employee_number TEXT    NOT NULL UNIQUE CHECK (length(employee_number) > 0),
      first_name      TEXT    NOT NULL CHECK (length(trim(first_name)) > 0),
      last_name       TEXT    NOT NULL CHECK (length(trim(last_name)) > 0),
      job_title       TEXT    NOT NULL CHECK (length(trim(job_title)) > 0),
      department      TEXT    NOT NULL CHECK (length(trim(department)) > 0),
      country         TEXT    NOT NULL CHECK (length(country) = 2 AND country = upper(country)),
      salary_minor    INTEGER NOT NULL CHECK (salary_minor > 0),
      currency        TEXT    NOT NULL REFERENCES fx_rates(currency),
      hired_at        TEXT    NOT NULL CHECK (date(hired_at) = hired_at)
    ) STRICT;
    ```
  - `employees/employees.repository.ts`:
    - `listEmployees(db, query: { page: number; pageSize: number }): Page<Employee>`. `ORDER BY last_name, first_name, id`, `LIMIT/OFFSET`, `COUNT(*) OVER()` for `total`. The count runs separately only when the page is empty (no row carries the window value).
    - `replaceAllEmployees(db, rows: NewEmployee[]): void`. `DELETE` + inserts in one `db.transaction()`. `NewEmployee = Omit<Employee, "id">`, local to the server.
  - `employees/employees.routes.ts`: `employeeRoutes(db, config)` → `{ [API_ROUTES.employees]: { GET: withAuth(...) } }`. Register in `routes.ts`.
  - `seed/random.ts`: `createRandom(seed: number) → { next(): number; int(min, max): number; pick<T>(items: readonly T[]): T }` (mulberry32, ~10 lines).
  - `seed/data.ts`: `SEED_COUNTRIES` (`code`, `currency`, `payFactor`, local first/last names incl. accented ones like José, Zoë), `SEED_JOBS` (`title`, `department`, `baseUsd`). About 8 countries, 6 departments, 20 titles. The FX values in the migration must cover every `currency` here (a test checks it).
  - `seed/generate-employees.ts`: pure. `generateEmployees(count: number, seed: number): NewEmployee[]`. Salary = `baseUsd × payFactor × random spread`, converted to the local currency with the snapshot rate and rounded to a whole thousand in major units, then stored in minor units. Employee numbers `E00001`…; hire dates between 2010-01-01 and 2026-09-30.
  - `seed/seed.ts`: CLI wiring. `loadConfig()` → `openDatabase(config.databasePath)` → `replaceAllEmployees(db, generateEmployees(10_000, 42))` → `ANALYZE`.
  - Scripts (wiring): server `"seed": "bun --env-file=../../.env src/seed/seed.ts"`, root `"seed": "bun run --filter '@smt/server' seed"`.
- **Frontend:**
  - `bunx shadcn add table` → `components/ui/table.tsx` (no new dependencies).
  - `lib/format.ts`: `formatMoney(minor: number, currency: string): string` (`Intl.NumberFormat`, using its `maximumFractionDigits` for the currency to scale minor → major) and `formatCountry(code: string): string` (`Intl.DisplayNames`). Lives in `lib/` because insights needs both next.
  - `features/employees/employees.api.ts`: `listEmployees(params: URLSearchParams): Promise<Page<Employee>>`
  - `features/employees/EmployeeTable.tsx`: `EmployeeTable({ employees }: { employees: Employee[] })`. Salary right-aligned, `tabular-nums`; sticky header.
  - `features/employees/EmployeesPage.tsx`: fetches on mount, `Skeleton` rows while loading, inline alert + Retry on `ApiError`.
  - `components/AppShell.tsx`: takes `children`, adds the left nav with "Employees". `App.tsx` renders `<EmployeesPage/>` inside it.
- **Libraries added:** none.
- **Test list:**
  - [x] unit `random`: same seed → same sequence · different seed → different sequence
  - [x] unit `generate-employees`: 10,000 rows · same seed → deep-equal output · every `salaryMinor` is a positive integer · employee numbers unique · every currency is in the migration's snapshot
  - [x] integration `employees.repository` (schema): `salary_minor` of `0`, `-1`, `12.5` each throw · unknown currency throws · duplicate employee number throws · lowercase country throws
  - [x] integration `employees.repository`: `replaceAllEmployees` twice leaves only the second set
  - [x] integration `employees.routes`: 200 with 50 items ordered by last then first name, `total` · every field present · no cookie → 401
  - [x] unit `lib/format`: `formatMoney(6500000, "JPY")` → `¥6,500,000` (0 decimals) · `formatMoney(15000000, "USD")` → `$150,000.00` · `formatCountry("IN")` → `India`
  - [x] component `EmployeesPage`: rows rendered from a mocked `listEmployees` · skeleton while loading · `ApiError` shows alert, Retry refetches
- **Quality checks:** routes contain no SQL · `generate-employees.ts` and `random.ts` have no I/O and no `Math.random` · money never a float in `employees` · tables `STRICT`

## Slice 2: Pagination

- **Design intent:** query-param validation at the route boundary, and URL-backed page state on the client.
- **API contract:** none new (`Page<T>` already carries `page`, `pageSize`).
- **Backend:**
  - `employees/validate-list-query.ts`: pure. `validateListQuery(params: URLSearchParams): { ok: true; value: EmployeeListQuery } | { ok: false; errors: Record<string, string> }`. Defaults `page=1`, `pageSize=50`. Grows a field per slice.
  - Route calls it and returns `400 validation` with `details` on failure.
- **Frontend:**
  - `lib/router.ts`: `useQueryParams(): [URLSearchParams, (next: Record<string, string | undefined>) => void]`. Reads `location.search`, writes with `history.pushState`, listens to `popstate`. Only the query-param half of the router for now; screen routing arrives with Insights (spec 04).
  - `features/employees/Pagination.tsx`: `Pagination({ page, pageSize, total, onPageChange })`. "Showing 51–100 of 10,000", Previous/Next.
  - `EmployeesPage` reads `page` from the URL and refetches when it changes.
- **Libraries added:** none.
- **Test list:**
  - [x] unit `validate-list-query`: defaults · `pageSize` `0`, `101`, `abc` → error · `page` `0`, `1.5` → error
  - [x] integration `employees.routes`: page 2 = items 51–100 of the same order · past last page → `[]` with real `total` · bad `pageSize` → 400 with `details.pageSize`
  - [x] component `Pagination`: range text · Previous disabled on page 1 · Next disabled on last page
  - [x] component `EmployeesPage`: clicking Next writes `page=2` to the URL · loading with `?page=3` requests page 3
- **Quality checks:** no unvalidated query param reaches the repository

## Slice 3: Filters

- **Design intent:** exact-match filters in SQL backed by indexes, and an options endpoint so the selects always match the data.
- **API contract:**
  - `api-routes.ts`: `employeeFilters: "/api/employees/filters"`
  - `api-types.ts`: `export interface EmployeeFilterOptions { countries: string[]; departments: string[]; jobTitles: string[] }`
- **Backend:**
  - Migration `003_employee_indexes.sql`: `employees(country, job_title)`, `employees(department)`, `employees(job_title)`.
  - `validateListQuery` accepts `country`, `department`, `jobTitle` (trimmed; empty = absent).
  - `listEmployees` adds `WHERE` clauses built from a fixed list, values bound as parameters.
  - `listFilterOptions(db): EmployeeFilterOptions`. Three `SELECT DISTINCT … ORDER BY`.
  - Route `GET /api/employees/filters` (auth). Registered before `/api/employees/:id` will be in spec 03.
- **Frontend:**
  - `features/employees/EmployeeFilters.tsx`: `EmployeeFilters({ options, value, onChange, onClear })`. Three labelled shadcn `Select`s with an "All" option; countries shown via `formatCountry`.
  - `employees.api.ts`: `getFilterOptions(): Promise<EmployeeFilterOptions>`
  - `EmployeesPage`: filters in the URL; changing one drops `page`. Empty result shows "No employees match these filters." + "Clear filters".
- `bunx shadcn add select` → `components/ui/select.tsx`, with the focus ring removed per frontend.md.
- **Libraries added:** `@radix-ui/react-select` (shadcn `Select`'s peer; on frontend.md's allowed list).
- **Test list:**
  - [ ] integration `employees.routes`: `country=IN` → only IN, filtered `total` · department / jobTitle exact match · combined filters · unknown value → 200 `[]` · filters endpoint returns sorted distinct values · filters endpoint without cookie → 401
  - [ ] integration `employees.repository`: `EXPLAIN QUERY PLAN` for each single filter has no `SCAN employees`
  - [ ] component `EmployeeFilters`: selecting a country calls `onChange` with it · "All" clears it
  - [ ] component `EmployeesPage`: changing a filter resets to page 1 · URL filters are applied on load · empty state + Clear filters
- **Quality checks:** filter values only ever bound as parameters

## Slice 4: Name search

- **Design intent:** FTS5 prefix search, accent- and case-insensitive, combined with filters. User input never reaches the `MATCH` string unquoted.
- **API contract:** none new (`q` query param).
- **Backend:**
  - Migration `004_employees_fts.sql`: `employees_fts` (`content='employees'`, `content_rowid='id'`, `tokenize='unicode61 remove_diacritics 2'`) over `first_name`, `last_name`; `AFTER INSERT/UPDATE/DELETE` triggers; `INSERT INTO employees_fts(employees_fts) VALUES('rebuild')` for existing rows.
  - `employees/to-fts-query.ts`: pure. `toFtsQuery(q: string): string | null`. Splits on whitespace, doubles `"` inside each word, returns `"kri"* "sha"*`; `null` for blank input.
  - `listEmployees` joins `employees_fts` when `q` is present and orders by `bm25()` unless a sort is given (Slice 5).
- **Frontend:**
  - `EmployeeFilters` gets a labelled search `Input`. `EmployeesPage` debounces it 250 ms, writes `q` to the URL, drops `page`. Each fetch has an `AbortController` so a slow older response can't overwrite a newer one.
- **Libraries added:** none.
- **Test list:**
  - [ ] unit `to-fts-query`: `kri sha` → `"kri"* "sha"*` · `  ` → `null` · `a"b` → `"a""b"*`
  - [ ] integration `employees.routes`: `q=krishna` prefix match · `q=jose` finds `José` · `q=kri sha` finds Krishna Sharma · `q` + `country` combined · `q` of `"`, `*`, `(`, `:`, `-` → 200 · whitespace `q` → same as none
  - [ ] integration `employees.repository`: after an `UPDATE` of a name, search finds the new name (trigger works)
  - [ ] component `EmployeesPage`: typing updates the list without Enter and resets to page 1 · `q` in the URL fills the box on load
- **Quality checks:** no string concatenation of `q` into SQL

## Slice 5: Sorting

- **Design intent:** sort from a whitelist; salary sorts by USD via the `fx_rates` join; `id` breaks ties.
- **API contract:** `api-types.ts`:
  ```ts
  export const EMPLOYEE_SORTS = ["name", "salary", "hiredAt", "country"] as const;
  export type EmployeeSort = (typeof EMPLOYEE_SORTS)[number];
  export type SortOrder = "asc" | "desc";
  ```
- **Backend:**
  - `validateListQuery` accepts `sort` (default `name`) and `order` (default `asc`).
  - `listEmployees`: a `Record<EmployeeSort, string>` of ORDER BY expressions (`salary` → `e.salary_minor * f.usd_cents_per_minor`), always followed by `, e.id`.
- **Frontend:**
  - `EmployeeTable` gets `sort`, `order`, `onSort(sort)`; sortable headers are buttons with `aria-sort`. Salary header: "Salary · sorted in USD".
  - `EmployeesPage`: same column toggles order, a new column starts at `asc`; written to the URL.
- **Libraries added:** none.
- **Test list:**
  - [ ] unit `validate-list-query`: unknown `sort` → error · `order=up` → error
  - [ ] integration `employees.routes`: `sort=salary` puts a ¥6,500,000 employee below a $150,000 one · ties stable across pages (no row repeated or missed between page 1 and 2)
  - [ ] component `EmployeeTable`: clicking a header calls `onSort` · `aria-sort` reflects the current order · Salary header text
- **Quality checks:** sort column never comes from user input directly

## Performance
- [ ] integration: seed 10,000 via `generateEmployees` into `:memory:`, run a matrix of filter / search / sort combinations, assert each `listEmployees` call < 50 ms (median of 5 runs, to avoid flaky one-off spikes).

## Decisions
1. **Select component:** shadcn `Select` (adds `@radix-ui/react-select`), as frontend.md lists.
2. **FX snapshot** lives in migration `002_employees.sql`, so `fx_rates` exists in every database. A rate update is a new numbered migration. backend.md updated to match.

## As built
_Filled in after the build._

---
- [x] Reviewed
