# Spec: Employee list
Risk: MODERATE
Requirement: [requirements.md → What the HR manager needs to do](../requirements.md#what-the-hr-manager-needs-to-do) (#1) and [Must have](../requirements.md#must-have-mvp) ("Employee list…", "A seed script…"), money decisions in [ADR-002](../adrs/002-salary-currency-and-usd-reporting.md)

## Overview
The HR manager sees all employees in a paged table and finds people by name, country, department, or job title. The data comes from a deterministic seed of 10,000 employees, so demos and tests always show the same rows.

## Slice 1: HR sees the first page of employees (walking skeleton)
- [x] Running the seed creates exactly 10,000 employees
- [x] Running the seed twice with the same seed value produces identical employees
- [x] Running the seed replaces existing employees instead of adding to them
- [x] Every seeded employee has a unique employee number (`E00001`–`E10000`)
- [x] Every seeded employee has a positive integer `salary_minor` and a `currency` present in `fx_rates`
- [x] The database rejects an employee whose `salary_minor` is zero, negative, or not an integer
- [x] The database rejects an employee whose `currency` is not in `fx_rates`
- [x] The database rejects a duplicate employee number
- [x] `GET /api/employees` returns `200` with the first 50 employees, sorted by last name then first name, plus `total`
- [x] Each employee in the response has `id`, `employeeNumber`, `firstName`, `lastName`, `jobTitle`, `department`, `country`, `salaryMinor`, `currency`, `hiredAt`
- [x] `GET /api/employees` without a session returns `401` `unauthenticated`
- [x] The Employees page shows a table with employee number, name, job title, department, country, salary, and hire date
- [x] Country is shown as its English name (`IN` → India)
- [x] Salary is shown in the employee's own currency with the right decimals (e.g. `¥6,500,000`, `$150,000.00`)

## Slice 2: Pagination
- [x] `?page=2` returns employees 51–100 of the same ordering
- [x] `?pageSize=` accepts 1–100; any other value returns `400` `validation`
- [x] A non-integer or zero `page` returns `400` `validation`
- [x] A page past the last one returns `200` with an empty list and the real `total`
- [x] The page shows "Showing 51–100 of 10,000" and Previous/Next buttons
- [x] Previous is disabled on the first page, and Next is disabled on the last page
- [x] The current page is kept in the URL, so reloading shows the same page

## Slice 3: Filters
- [x] `?country=IN` returns only employees in India, with `total` counting only them
- [x] `?department=` and `?jobTitle=` each filter to exact matches
- [x] Filters combine: `?country=IN&jobTitle=Software Engineer` returns only employees matching both
- [x] An unknown filter value returns `200` with an empty list, not an error
- [x] `GET /api/employees/filters` returns the distinct countries, departments, and job titles, each sorted alphabetically
- [x] The page has a select for country, department, and job title, filled from that endpoint
- [x] Changing a filter goes back to page 1
- [x] Filters are kept in the URL, so reloading or sharing the link shows the same list
- [x] When no employee matches, the page shows "No employees match these filters." with a "Clear filters" action
- [x] Filtering by country, by department, and by job title each use an index (no `SCAN employees` in the query plan)

## Slice 4: Name search
- [x] `?q=krishna` returns employees whose first or last name starts with "krishna"
- [x] Search ignores letter case and accents (`jose` finds `José`)
- [x] Each word is a prefix: `kri sha` finds `Krishna Sharma`
- [x] Search combines with filters
- [x] Characters with special meaning in the search syntax (`"`, `*`, `(`, `:`, `-`) are treated as plain text and never return `500`
- [x] A blank or whitespace-only `q` is ignored
- [x] Typing in the search box updates the list without pressing Enter, and goes back to page 1
- [x] The search text is kept in the URL

## Slice 5: Sorting
- [x] `?sort=` accepts `name`, `salary`, `hiredAt`, `country`; any other value returns `400` `validation`
- [x] `?order=` accepts `asc` or `desc`; any other value returns `400` `validation`
- [x] Sorting by `salary` orders by USD value (¥6,500,000 ranks below $150,000)
- [x] Employees with equal sort values come back in a stable order across pages (ties broken by `id`)
- [x] Clicking a sortable column header sorts by it, and clicking again reverses the order
- [x] The Salary header reads "Salary · sorted in USD"
- [x] The sort is kept in the URL

## Performance
- [x] With the 10,000-employee seed, the list query with any filter, search, or sort combination runs in under 50 ms

## API shape (indicative)
```
GET /api/employees?page=1&pageSize=50&q=&country=&department=&jobTitle=&sort=name&order=asc
  → 200 { items: Employee[], total, page, pageSize }
  → 400 { error: { code: "validation", details } }
  → 401 { error: { code: "unauthenticated" } }
GET /api/employees/filters
  → 200 { countries: string[], departments: string[], jobTitles: string[] }
```

## Out of scope
- Add, edit, and delete (the CRUD spec).
- Insights and USD figures in the list (the insights spec). The list shows the pay currency only.
- Typo-tolerant search (`krisna` → `Krishna`). See backend.md → Search.
- Multi-select filters, salary range filters, and column picking.
- Excel import/export (requirements → Not doing).
- Updating FX rates. The seed loads a fixed, dated snapshot.

## Decisions
- **Columns:** employee number, first and last name, job title, department, country, salary + currency, hire date.
- **Filter options** come from `GET /api/employees/filters` (distinct values in the data), so they never drift from it.
- **Country** is stored as an ISO 3166 alpha-2 code (`IN`) and shown as its name in the UI.

---
- [x] Reviewed
