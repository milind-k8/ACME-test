# Requirements

Written before starting the build. The bigger decisions on ambiguous parts are recorded as ADRs in [adrs/](adrs/).

## Problem

ACME's HR team tracks salaries for about 10,000 employees across several countries in Excel. That breaks down at this size: files get copied around, formulas break, and a simple question like "what do we pay engineers in India?" means filtering and pivoting by hand every time.

The user is the HR manager. They're comfortable with spreadsheets, so the app has to be at least as quick as Excel for the everyday tasks, or they won't switch.

## What the HR manager needs to do

1. Find an employee quickly by name, or narrow the list by country, department, or job title.
2. Add a new hire, update a salary, and remove someone who has left.
3. See how pay looks per country: lowest, highest, average, and median salary, plus headcount.
4. Compare pay for the same job title, both within one country and across countries.
5. Get a quick overview of headcount by country and by department.

Two things make 3 and 4 harder than they look:

- **People are paid in different currencies.** I store each salary in the currency it's actually paid in, and convert to USD only when comparing. I use a fixed set of exchange rates and show the date they're from, so nobody mistakes them for live rates.
- **The averages can be skewed.** A few very high salaries pull the average up, so I show the median next to it.

## Must have (MVP)

- Login for the HR manager. This is salary data, so it shouldn't be open to anyone with the URL.
- Employee list with search, filters, sorting, and pagination. 10k rows is too many to load at once.
- Add, edit, and delete an employee, with validation (e.g. no negative or zero salary, valid currency).
- Insights per country and per job title, shown in USD.
- A seed script that creates 10,000 realistic employees and gives the same data on every run, so demos and tests are repeatable.

## Nice to have, if time allows

- Headcount by department chart on the overview.
- Showing salaries in their original currency alongside the USD figure in the insight tables.

## Not doing, and why

- **Excel import/export.** This is honestly the feature I'd build next, since it's how HR would actually move their data over. But it involves messy-file handling (bad rows, duplicates, different column names) that deserves its own design. I'd rather get the core data model right first.
- **Salary history / audit log.** Useful ("who changed this and when"), but it's a second data model. I've kept the schema simple enough to add it later.
- **Multiple users and roles.** There's one persona. Roles only make sense once there's a second kind of user (e.g. a manager who can only see their team).
- **Live exchange rates.** These need an external API, and the numbers would change between page loads. A dated snapshot is more honest for a report.
- **Payroll, tax, bonuses, benefits.** That's a different product. The brief is about managing and understanding salaries, not paying them.

## How I'll know it works

- Search, filters, and insight pages respond in well under a second with 10k employees.
- The salary totals in the database never drift. Money is stored as whole numbers, not floats.
- Core logic and every API endpoint are covered by tests written before the code, and the test suite runs in a few seconds.
- It's deployed at a URL that anyone reviewing can log into, with a short demo video.

## Open points

- The exchange rates will be a hardcoded snapshot. If HR needed them updated, who would update them, and how often? Not solved here.
- I'm assuming salary means annual gross. Part-timers and contractors are stored the same way, which may not be how ACME thinks about them.

---
- [x] Reviewed
