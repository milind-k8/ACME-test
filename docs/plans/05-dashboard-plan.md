# Plan: Dashboard
Spec: [05-dashboard-spec.md](../specs/05-dashboard-spec.md) · Decisions: [ADR-002](../adrs/002-salary-currency-and-usd-reporting.md)

Query design: [ADR-007](../adrs/007-dashboard-aggregation.md); caching: [ADR-008](../adrs/008-dashboard-cache.md). The feature folder is `dashboard/` (backend.md sketched it as `insights/`; renamed there in Slice 1, frontend.md already updated). Charts use Recharts per [ADR-006](../adrs/006-recharts-for-dashboard-charts.md).

## Slice 1: Headline figures (walking skeleton)

- **Design intent:** one query fetches the filtered employees' USD salaries (converted and sorted in SQL); one pure function turns them into every figure on the page. Screen routing arrives, because there are now two pages.
- **API contract** (`shared/api-types.ts`, `api-routes.ts`):
  ```ts
  export interface PayStats {
    headcount: number;
    payrollUsdCents: number;   // all integers
    minUsdCents: number;
    medianUsdCents: number;
    avgUsdCents: number;
    maxUsdCents: number;
  }
  export interface Dashboard {
    fxAsOf: string;            // YYYY-MM-DD
    summary: PayStats & { hiresLast12Months: number; avgTenureYears: number };
    byCountry: (PayStats & { country: string })[];      // grows in Slices 2–4
    byDepartment: (PayStats & { department: string })[];
    byJobTitle: (PayStats & { jobTitle: string })[];
  }
  // api-routes.ts
  dashboard: "/api/dashboard",
  ```
  `EMPLOYEE_FILTERS` moves to `shared/` so both features (and the web) read the same three filter names.
- **Backend:**
  - `dashboard/dashboard.repository.ts`: `listPay(db, filters): PayRow[]` where `PayRow = { country, department, jobTitle, usdCents, hiredAt }`. One query: `SELECT … round(e.salary_minor * fx.usd_cents_per_minor) AS usdCents … JOIN fx_rates fx … WHERE <filters> ORDER BY usdCents`. `fxAsOf(db): string` (`max(as_of)`).
  - `dashboard/summarize.ts` (pure): `payStats(sortedUsdCents: number[]): PayStats`, `median(sorted: number[]): number`, `summarize(rows: PayRow[], today: string): Dashboard["summary"]`. Tenure and the 12-month window take `today` as an argument.
  - `dashboard/dashboard.routes.ts`: `GET /api/dashboard` (auth); filters parsed with the shared names; `today` from the injected `now()`.
  - Register in `routes.ts`.
- **Frontend:**
  - `lib/router.ts`: add `usePath(): string` and `navigate(path: string): void` (same listener set as `useQueryParams`). Two routes: `/` → Dashboard, `/employees` → Employees; anything else → Dashboard.
  - `AppShell.tsx`: nav links "Dashboard" (first) and "Employees", client-side navigation, `aria-current="page"` on the active one; `App.tsx` picks the page from `usePath()`.
  - `lib/format.ts`: `formatUsd(cents: number): string` → `$84,512` (whole dollars).
  - `features/dashboard/dashboard.api.ts`: `getDashboard(params: URLSearchParams): Promise<Dashboard>`.
  - `features/dashboard/DashboardPage.tsx`: six stat tiles in a grid, the FX note, skeletons, alert with Retry.
  - `features/dashboard/StatTile.tsx`: `StatTile({ label, value, hint? })`.
- **Libraries added:** none (Recharts arrives with the first chart in Slice 2).
- **Test list:**
  - [x] unit `summarize`: `median` of odd and even counts · `payStats` of `[100, 200, 400]` → headcount 3, payroll 700, min 100, median 200, avg 233, max 400 · empty list → zeros · hires: a date exactly one year before `today` is not counted, the day after is · tenure: two employees of 1 and 2 years → 1.5
  - [x] integration `dashboard.repository`: rows come back sorted by USD; ¥6,500,000 converts to 4,355,000 cents with the snapshot rate
  - [x] integration `dashboard.routes`: 200 with summary figures equal to a hand computation over the seeded rows · `fxAsOf` = `2026-10-01` · no cookie → 401
  - [x] unit `lib/format`: `formatUsd(8_451_249)` → `$84,512`
  - [x] unit `lib/router`: `navigate("/employees")` updates `usePath()`; Back restores it
  - [x] component `App`: lands on the Dashboard after login · clicking Employees shows the employee list and marks it current
  - [x] component `DashboardPage`: six tiles with formatted values · FX note · skeleton while loading · alert + Retry
- **Quality checks:** USD conversion only in SQL, rounded once per employee · `summarize.ts` has no I/O · routes contain no SQL

## Slice 2: Pay per country

- **Backend:** `summarize` adds `byCountry`: rows grouped by country, `payStats` per group, largest headcount first.
- **Frontend:** `features/dashboard/PayTable.tsx`: `PayTable({ caption, groupLabel, rows, format? })` with headcount, payroll, lowest, median, average, highest; countries via `formatCountry`.
  - First chart: `bunx shadcn add chart` → `components/ui/chart.tsx` + `recharts` 3.10.1 and `react-is` (pinned exact; strip `cn`/`radix-ui`/`lucide-react` as before). `features/dashboard/MedianPayChart.tsx`: horizontal bars of median USD per country, tooltip in whole dollars.
- **Libraries added:** `recharts` 3.10.1, `react-is` (Recharts' peer), per ADR-006.
- **Test list:**
  - [x] unit `summarize`: groups by country, each group's stats match `payStats` of its rows, ordered by headcount
  - [x] component `PayTable`: a row's figures in whole dollars, right-aligned
  - [x] component `MedianPayChart`: renders a figure titled "Median pay by country" with an `sr-only` summary of each country's median

## Slice 3: Pay per department

- **Backend:** `byDepartment`, largest headcount first.
- **Frontend:** a second `PayTable`; `features/dashboard/HeadcountChart.tsx` (horizontal bars, one per department).
- **Test list:**
  - [x] unit `summarize`: `byDepartment`
  - [x] component `HeadcountChart`: renders a figure titled "Headcount by department" with an `sr-only` list of each department and its count

## Slice 4: Pay per job title

- **Backend:** `byJobTitle`, highest median first.
- **Frontend:** a third `PayTable`.
- **Test list:**
  - [x] unit `summarize`: `byJobTitle` ordered by median

## Slice 5: Salary distribution and hiring

- **API contract:** `Dashboard` gains `salaryBands: { fromUsdCents: number; toUsdCents: number | null; headcount: number }[]` and `hiresByMonth: { month: string; hires: number }[]`.
- **Backend:** `summarize.ts`: `salaryBands(sortedUsdCents)` ($25,000 bands, last band "$200,000+", every band present) and `hiresByMonth(rows, today)` (12 months ending with today's month, every month present).
- **Frontend:** `SalaryDistributionChart.tsx` (columns per band, reference lines at median and average) and `HiresChart.tsx` (columns per month, labels like "Oct").
- **Test list:**
  - [x] unit `summarize`: a salary of exactly $25,000 falls in the second band · $250,000 falls in "$200,000+" · all 9 bands present with zeros · hires: 12 months, oldest first, current month last, a hire 13 months ago not counted, empty months are 0
  - [x] component: each chart renders its titled figure and `sr-only` summary

## Slice 6: Filters

- **Design intent:** reuse the employee list's filter bar instead of a second copy.
- **Backend:** the repository's `WHERE` uses the shared filter names and the existing indexes.
- **Frontend:** `EmployeeFilters` moves to `components/FilterBar.tsx` (its second user, so it's shared now); the search box becomes optional. The dashboard keeps filters in the URL with `useQueryParams`; empty result → "No employees match these filters." + Clear filters.
- **Test list:**
  - [x] integration `dashboard.routes`: each filter narrows the summary headcount to the matching rows · filters combine · unknown value → 200, headcount 0, empty tables
  - [x] integration `dashboard.repository`: `EXPLAIN QUERY PLAN` with each filter has no full scan of employees
  - [x] component `DashboardPage`: choosing a job title refetches with it and writes it to the URL · empty state + Clear filters

## Slice 7: Cache without stale data

- **Design intent:** [ADR-008](../adrs/008-dashboard-cache.md). The version is read before the query; the cache is cleared whenever it changes.
- **Backend:**
  - `dashboard/dashboard.repository.ts`: `dataVersion(db): string` (`total_changes()` + `PRAGMA data_version`).
  - `dashboard/response-cache.ts` (pure): `createResponseCache<T>(maxEntries: number)` → `{ get(version, key): T | undefined; set(version, key, value): void }`. A `Map` in insertion order: a hit is re-inserted (most recent), the oldest is evicted past `maxEntries`, and a new version clears everything.
  - `dashboard.routes.ts`: key = sorted filter params + today; `version` read first, then `cache.get` or compute and `cache.set`. One cache per `dashboardRoutes(db, …)` call, so each test server starts empty.
- **Libraries added:** none.
- **Test list:**
  - [ ] unit `response-cache`: same version and key → hit · new version → miss and old entries gone · 101st key evicts the least recently used, not the most recently read
  - [ ] integration `dashboard.repository`: `dataVersion` changes after an insert through `db`, and after a write by a second `Database` on the same temp file; unchanged after a read
  - [ ] integration `dashboard.routes`: second identical request doesn't call the query (counted with a spy on the repository function) · POST then GET shows the new headcount · a second connection's delete then GET shows it · advancing the injected clock by a day recomputes tenure
- **Quality checks:** version read before the query · no TTL anywhere

## Performance
- [ ] integration: 10,000 seeded employees, `GET /api/dashboard` logic (repository + `summarize`) under 50 ms (median of 5) with no filters and with each filter

## Query design
Decided in [ADR-007](../adrs/007-dashboard-aggregation.md) with measurements: one filtered, USD-converted query sorted by salary, grouped in a single pass in `summarize.ts`. 5.2 ms unfiltered at 10,000 rows, against 37–57 ms for window-function medians in SQL.

## As built
_Filled in after the build._

---
- [x] Reviewed
