# Plan: Original currency in the dashboard tables
Spec: [07-original-currency-spec.md](../specs/07-original-currency-spec.md)

## Slice 1: Single-currency rows show their own currency

- **Design intent:** the same single pass as ADR-007. Within one currency, sorting by USD is the same order as sorting by the stored amount (the rate is positive), so each group's local amounts are already sorted too and the median is still the middle element.
- **API contract** (`shared/api-types.ts`):
  ```ts
  export interface LocalPay {
    currency: string;
    payrollMinor: number; minMinor: number; medianMinor: number; avgMinor: number; maxMinor: number;
  }
  // byCountry / byDepartment / byJobTitle rows gain:  local: LocalPay | null
  ```
- **Backend:**
  - `dashboard.repository.ts`: `listPay` also selects `e.salary_minor AS salaryMinor, e.currency`; `PayRow` gains both.
  - `summarize.ts`: `groupBy` collects each group's `salaryMinor` list and a single currency (or a "mixed" marker); `localPay(currency, sortedMinor): LocalPay` reuses `median`. Medians of an even count round to a whole minor unit, as USD does.
- **Frontend:**
  - `PayTable`: each money cell renders the USD figure and, when `row.local` exists, `formatMoney(local…Minor, local.currency)` under it in `text-xs text-muted-foreground`.
- **Libraries added:** none.
- **Test list:**
  - [x] unit `summarize`: an all-INR group gets `local` with INR minor-unit stats that equal `payStats` of its `salaryMinor` values · a group with INR and USD gets `local: null` · local median comes from `salary_minor` (a case where USD rounding would give a different answer)
  - [x] integration `dashboard.routes`: `byCountry` row for IN has `local.currency = "INR"` and the right median · with `?country=IN`, `byDepartment` rows have INR `local` · unfiltered `byDepartment` rows are `null` (seeded departments span countries)
  - [x] component `PayTable`: a row with `local` shows `$45,001` and `₹3,750,000.00` in the median cell · a row without shows only USD
  - [x] performance test still under 50 ms
- **Quality checks:** no USD → local conversion anywhere · `summarize.ts` stays pure

## As built

Built on branch `feat/original-currency`. `bun run check` passes with 294 server and 89 web tests; checked in Chrome unfiltered (each country in its own currency) and filtered to India (every department and job-title row in rupees).

**Files:** `shared/api-types.ts` (`LocalPay`, `GroupPay<K>`), `dashboard/dashboard.repository.ts` (`salaryMinor`, `currency` selected), `dashboard/summarize.ts` (`groupBy` tracks each group's amounts and single currency; `localPay`), `features/dashboard/PayTable.tsx`.

**Differences from the plan, and why**
- **USD groups don't repeat the amount.** A row paid in USD would show "$97,000" over "$97,000.00"; the second line is hidden when the group's currency is USD.
- **Performance unchanged:** the extra two columns ride on the same query and pass; the performance test still passes.

---
- [x] Reviewed
