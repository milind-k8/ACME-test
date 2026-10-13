# ADR-002: Store salary in pay currency, report in USD

**Status:** Accepted · 2026-10-13

## Context
ACME has employees "across multiple countries". HR needs to manage each person's real salary, and also compare pay across countries ("are we paying engineers in Germany more than in India?"). That comparison needs one common currency.

## How I got here
1. **Local currency, per-country insights only.** This was the first draft. It's simple, but it can't answer cross-country questions, and for a global org those are the interesting ones.
2. **Everything stored in USD.** I tried this next to keep things simple. It throws away the amount the employee is actually paid, and a converted figure becomes the record of truth.
3. **Pay currency stored, USD derived (chosen).**

## Decision
- Each employee has `currency` (ISO 4217) and `salary_minor`, an integer in that currency's minor units.
- Currency is per employee, not derived from country, because expats and contractors are often paid in another currency. The UI pre-fills the country's usual currency.
- An `fx_rates` table holds a dated snapshot as `usd_cents_per_minor`. Expressing the rate per minor unit absorbs the different decimal places (JPY has 0, USD has 2), so no exponent table is needed.
- `fx_rates` is also the list of supported currencies, enforced by a foreign key.
- Every USD figure in the UI shows the date of the rate snapshot.

## Alternatives considered
- **Live FX API.** Current rates, but it adds an external dependency, the numbers shift between page loads, and tests can't be deterministic.
- **Storing a USD copy on each employee.** That's fast, but the copy goes stale whenever the rates change. Converting at query time is cheap at 10k rows.

## Consequences
- Stored amounts are always exact integers. Converted USD figures use a `REAL` rate and are rounded only for display, which is acceptable because they're reporting figures, not records.
- Updating the rates is a manual data change. If HR needs fresh rates, add a scheduled fetch job.
