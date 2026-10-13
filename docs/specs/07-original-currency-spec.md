# Spec: Original currency in the dashboard tables
Risk: LOW
Requirement: [requirements.md → Nice to have](../requirements.md#nice-to-have-if-time-allows) ("Showing salaries in their original currency alongside the USD figure in the insight tables"), [ADR-002](../adrs/002-salary-currency-and-usd-reporting.md)

## Overview
USD makes groups comparable; the original currency is what people are actually paid and what HR quotes in offers. When everyone in a table row is paid in the same currency, the dashboard tables show that row's figures in it, under the USD figure, computed from the stored amounts with no exchange rate involved.

## Slice 1: Single-currency rows show their own currency
- [x] For a group whose employees are all paid in one currency, the API returns that currency and the group's payroll, lowest, median, average, and highest salary in its minor units
- [x] A group paid in more than one currency has no original-currency figures (`local: null`)
- [x] Original-currency figures come from `salary_minor`, not converted back from USD
- [x] This applies to every group table: country, department, and job title
- [x] In the pay tables, a row with original-currency figures shows each money cell's local amount under the USD one (e.g. `$45,001` over `₹3,750,000`), in muted text
- [x] A mixed-currency row shows the USD figures only
- [x] Filtering to one country makes its department and job-title rows single-currency, so they show local figures too

## API shape (indicative)
```
PayStats & { country } & { local: { currency, payrollMinor, minMinor, medianMinor, avgMinor, maxMinor } | null }
```

## Decisions
- **Only for single-currency groups.** A median of mixed currencies has no meaning; showing one would mean picking a currency and converting, which is what the USD column already does.
- **Tables only**, as the requirement says; the headline figures and charts stay in USD.

## Out of scope
- Choosing a display currency other than USD.
- Original-currency figures in the headline tiles and charts.

---
- [x] Reviewed
