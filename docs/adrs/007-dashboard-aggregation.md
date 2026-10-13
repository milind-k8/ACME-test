# ADR-007: Dashboard figures from one sorted query, grouped in code

**Status:** Accepted · 2026-10-13 · Refines backend.md's "aggregate in SQL" rule for the dashboard

## Context
The dashboard (spec 05) needs, for the filtered employees and for every country, department, and job title: headcount, total payroll, min, max, average, and **median** salary in USD, plus salary bands and hires per month. SQLite has no median aggregate. The obvious "push everything to the database" design computes medians with window functions.

## What I measured
Seeded 10,000 employees, SQLite 3.51 via `bun:sqlite`, median of 9 runs on a laptop:

| Approach | No filter | `country = IN` | Rows leaving SQLite |
|---|---|---|---|
| **A. One filtered query, USD-converted and sorted by salary in SQL; one pass in code groups the rows and reads each median** | **5.2 ms** | **0.8 ms** | 10,000 / 1,260 |
| B. One SQL statement: `UNION ALL` of the four groupings, `ROW_NUMBER()`/`COUNT()` windows for medians | 57.0 ms | 6.6 ms | 37 |
| C. One SQL statement per dimension, window medians, USD computed once (`MATERIALIZED`) | 36.9 ms | 4.6 ms | ~37 |
| D. SQL `GROUP BY` per dimension for count and sum only, **no medians** (a floor for "all in SQL") | 6.9 ms | 0.9 ms | ~37 |

All approaches returned identical medians. With a filter, the query uses the indexes (`SEARCH e USING INDEX employees_country_job_title (country=?)`).

## Decision
**Approach A.** One query does what SQL is good at: filtering (through the indexes), joining `fx_rates`, converting to USD cents (rounded once per employee), and a single `ORDER BY usd`. It selects only the five columns needed. A pure function (`summarize.ts`) walks the rows once and appends each salary to its overall, country, department, and job-title groups. Because the input is already sorted, every group's list is sorted too, so each median is the middle element: O(n) after one O(n log n) sort, instead of a sort per group.

## Why not everything in SQL
- **There's no network hop.** SQLite runs inside the API process. "Moving compute to the database" usually saves sending rows over a network; here a row is a function call away, so the trade-off is CPU only.
- **Medians in SQL cost a sort per partition.** Window functions sort each grouping separately (about 40,000 rows sorted for four groupings), which is where B and C spend their time.
- **Even without medians, SQL grouping is slower here.** D reads the table once per dimension; A reads it once.
- **Correctness is easier to test.** The grouping rules (median of an even count, bands, the 12-month window, tenure) are plain functions with unit tests and an injected `today`.

## Consequences and limits
- Memory per request is O(filtered employees): about 10,000 small objects at full size, well under a megabyte.
- The approach is tied to an embedded database. **If the data moved to Postgres behind a network**, the balance changes: `percentile_cont(0.5) WITHIN GROUP` gives medians in the database and avoids shipping rows, so push the aggregation down.
- **At millions of rows**, recompute per request stops being cheap. Upgrade path: cache the response keyed by filters and a data version bumped on every write; beyond that, maintain summary tables.
- A performance test holds the dashboard under 50 ms at 10,000 rows, and a query-plan test proves filters use the indexes.
