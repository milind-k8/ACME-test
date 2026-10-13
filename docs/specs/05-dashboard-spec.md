# Spec: Dashboard
Risk: MODERATE
Requirement: [requirements.md → What the HR manager needs to do](../requirements.md#what-the-hr-manager-needs-to-do) (#3 pay per country, #4 compare a job title within and across countries, #5 headcount by country and department), [Must have](../requirements.md#must-have-mvp) ("Insights per country and per job title, shown in USD"), [Nice to have](../requirements.md#nice-to-have-if-time-allows) ("Headcount by department chart"), money rules in [ADR-002](../adrs/002-salary-currency-and-usd-reporting.md)

## Overview
The first page HR sees: the numbers they're asked for most, in USD from the dated FX snapshot, with the median next to the average. The same country, department, and job-title filters as the employee list narrow everything on the page, which is how HR compares: pick a job title and the per-country table compares that title across countries; add a country to see it within one country.

## Slice 1: Headline figures (walking skeleton)
- [x] `GET /api/dashboard` returns, for all employees: headcount, total annual payroll, median salary, average salary, hires in the last 12 months, and average tenure
- [x] Money is whole USD cents, converted with `fx_rates` (`salary_minor × usd_cents_per_minor`, rounded once per employee before summing)
- [x] The median of an even count is the average of the two middle values
- [x] "Hires in the last 12 months" counts hire dates after the same day one year ago, by the server's clock
- [x] Average tenure is the mean time since hire, in years to one decimal, by the server's clock
- [x] The response includes the FX snapshot date (`fxAsOf`)
- [x] Without a session it returns `401`
- [x] "Dashboard" is the first item in the sidebar, above "Employees", and is the page HR lands on after login
- [x] The page shows six figures: headcount, total annual payroll, median salary, average salary, hires in the last 12 months, average tenure
- [x] Money shows in whole dollars (`$84,512`), and the page says "in USD, rates as of 2026-10-01"
- [x] The page shows skeletons while loading and an alert with Retry on failure

## Slice 2: Pay per country
- [x] The response has one row per country: headcount, total payroll, lowest, median, average, and highest salary, largest headcount first
- [x] The page shows them as a table, money right-aligned in tabular figures, countries by name
- [x] A bar chart shows the median salary per country in USD

## Slice 3: Pay per department
- [x] The response has one row per department with the same figures, largest headcount first
- [x] The page shows them as a table
- [x] A bar chart shows headcount per department

## Slice 4: Pay per job title
- [x] The response has one row per job title with the same figures, highest median first
- [x] The page shows them as a table

## Slice 5: Salary distribution and hiring
- [x] The response has a salary distribution: headcount per $25,000 USD band from $0 up to "$200,000+", with every band present (zeros included)
- [x] The response has hires per month for the last 12 months (oldest first, including the current month), with every month present
- [x] A histogram shows the salary distribution, with the median and average marked
- [x] A column chart shows hires per month

## Slice 6: Filters
- [x] `?country=`, `?department=`, and `?jobTitle=` narrow every figure, table, and chart on the dashboard, and combine
- [x] An unknown filter value returns `200` with a headcount of 0 and empty tables, not an error
- [x] The page has the same three filter selects as the employee list, kept in the URL
- [x] With a job title chosen, the per-country table compares that title across countries
- [x] With no matching employees, the page says "No employees match these filters." with a "Clear filters" action

## Slice 7: Cache without stale data
- [ ] Asking for the same dashboard twice in a row doesn't run the dashboard query the second time
- [ ] After adding, editing, or deleting an employee through the API, the next dashboard request shows the change
- [ ] After another process changes the database (e.g. `bun run seed` while the API runs), the next dashboard request shows the change
- [ ] When the date changes, "hires in the last 12 months" and "average tenure" are recomputed
- [ ] Different filters are cached separately, and at most 100 responses are kept

## Performance
- [ ] With the 10,000-employee seed, `GET /api/dashboard` answers in under 50 ms with no filters and with each filter

## API shape (indicative)
```
GET /api/dashboard?country=&department=&jobTitle=
  → 200 {
      fxAsOf: "2026-10-01",
      summary: PayStats & { hiresLast12Months, avgTenureYears },
      byCountry:    (PayStats & { country })[],
      byDepartment: (PayStats & { department })[],
      byJobTitle:   (PayStats & { jobTitle })[],
      salaryBands:  { fromUsdCents, toUsdCents | null, headcount }[],
      hiresByMonth: { month: "2026-10", hires }[]
    }
PayStats = { headcount, payrollUsdCents, minUsdCents, medianUsdCents, avgUsdCents, maxUsdCents }   // integers
```

## Decisions
- **Dashboard comes first** in the sidebar and is the landing page after login.
- **Headline figures:** headcount, total annual payroll, median, average, hires in the last 12 months, average tenure. The salary range lives in the tables.
- **Whole dollars on the page**; the API keeps cents.
- **Responses are cached in the API**, invalidated by SQLite's own change counters so they're never stale ([ADR-008](../adrs/008-dashboard-cache.md)).
- **Charts use Recharts** through shadcn's Chart component ([ADR-006](../adrs/006-recharts-for-dashboard-charts.md)): median pay by country, headcount by department, salary distribution, hires per month. Every chart has a text alternative (the tables, or a visually hidden summary).

## Out of scope
- Original-currency figures next to USD (requirements → Nice to have; its own change).
- Chart types beyond the four above, and chart export or drill-down.
- Trends over time and leavers/attrition: both need history, and delete removes the row (requirements → Not doing).
- Exporting the dashboard.
- Live or editable FX rates.

---
- [x] Reviewed
