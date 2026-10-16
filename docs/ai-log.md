# AI Usage Log

I used Claude Code as a pair partner throughout. This log records what I asked for, what came back, and where I disagreed or changed direction. Routine boilerplate isn't logged.

## Planning (2026-10-13)

## Scaffold (2026-10-13)

- **Asked for:** frontend, backend, Docker and Compose on stable versions.
- **Versions:** the AI checked npm and Docker Hub instead of guessing. TypeScript 7.0 is the latest, but typescript-eslint only supports `<6.1`, so it pinned 6.0.3 and noted why in devops.md.
- **I changed direction:** the first scaffold followed devops.md (one `package.json`, one process). I asked for separate FE and BE environments. We chose Bun workspaces, two containers, and Caddy proxying `/api` so the browser still sees one origin and the cookie rules in ADR-003 hold. Recorded as [ADR-005](adrs/005-separate-web-and-api-packages.md).
- **I questioned** whether the root `node_modules` was needed. It is: it holds the shared tooling, and Bun's isolated installs keep each package's dependencies as symlinks into one store, so nothing is duplicated.
- **I added** frontend test setup (testing-library + happy-dom) now instead of deferring it. `@testing-library/dom` joined the allowed list as its required peer.
- **AI corrections:**
  - The `bun build` CLI silently skipped the Tailwind plugin, so the AI added a `build.ts` using `Bun.build`.
  - It dropped an empty `packages/shared` and an unused `databasePath` (YAGNI).

## Login (2026-10-13)

- **Asked for:** an implementation plan for login. The AI pointed out there was no spec yet, so it drafted [the spec](specs/01-login-spec.md) and [the plan](plans/01-login-plan.md) together for me to review.
- **I decided:**
  - Emails are stored lowercase.
  - There's one demo account whose credentials I share with reviewers, with no sign-up, password change or second account.
  - The cookie is always `Secure`.
  - `JWT_SECRET` is required in every environment, and I supply it through `.env`.
- **I changed process:** one branch per feature (`feat/login`), merged to `main` at the end.
- **Built test-first** in three slices. Guard tests that passed straight away were checked by breaking the code on purpose.
- **AI corrections:**
  - `shadcn add` imported `cn` from an unrelated npm package and installed it, twice. The AI caught it in the diff, reverted the dependencies and used the planned `@radix-ui/react-*` packages.
  - Bun's `cookies.delete` produced a logout cookie that didn't match the login cookie (`SameSite=Lax`, no `Secure`). It switched to clearing with the same attributes.
  - It stopped dev servers with a broad `pkill` pattern that could have killed mine, then switched to killing only the processes it started.
- **Left for later:** login rate limiting (ADR-003) and Sentry (ADR-004).

## Employee list (2026-10-13)

<!-- Draft by the AI for me to edit. -->

- **Asked for:** the next feature from requirements.md. The AI proposed the employee data model and seed as a separate feature first; **I merged them**, because the seed only exists to feed the list. The product features are list, CRUD, insights, and the nice-to-haves.
- **I decided:**
  - Employees get an employee number (`E00001`…).
  - Filter options come from `GET /api/employees/filters`, not a fixed list.
  - Countries are stored as ISO alpha-2 codes and named in the UI.
  - shadcn `Select` over a native `<select>`.
  - The FX snapshot lives in a migration, so every database has it and a rate change is a new migration. backend.md updated.
- **Built test-first** in five slices plus a 10k-row performance check. Constraint, trigger, and query-plan tests that passed straight away were checked by removing the constraint, trigger, or index on purpose.
- **AI corrections:**
  - `shadcn add` again installed the unrelated `cn` package, and this time the `radix-ui` umbrella package and a `lucide-react` import too. The AI removed them, installed only `@radix-ui/react-select`, and used local icons.
  - The query-plan test went blind when the list query aliased `employees` as `e` (SQLite then reports `SCAN e`). The AI found it by dropping an index and seeing the test still pass, then fixed the check.
  - happy-dom started at `about:blank`, where `history.pushState` does nothing, so URL-state tests couldn't pass. It gave the test DOM a real URL.
  - It moved `NewEmployee` to `@smt/shared` after noticing the repository imported it from `seed/`, against the import rules.
- **I reviewed it in the browser** and asked for: unique seeded names (they repeated ~12 times), only the table to scroll with filters always visible, a less bland look, no initials in table rows, and email and Log out in a menu behind my initial. I chose shadcn `DropdownMenu` over a hand-rolled menu.
- **AI corrections after review:**
  - The transparent dropdowns came from missing `--popover` theme tokens; component tests couldn't catch it because happy-dom applies no CSS.
  - Its first scroll fix used a percentage height that didn't resolve in a flex layout and hid the pagination. It then drove headless Chrome against the dev server to measure the layout and screenshot it, instead of guessing.
  - It checked contrast before picking colours: blue text on a blue tint fails AA, so tints carry dark text and the accent goes on icons.
  - The shadcn CLI again added `cn`, `radix-ui` and `lucide-react` for Select and DropdownMenu; it removed them each time.
- **Found along the way:** my local `.env` has the Docker `DATABASE_PATH`, so `bun run seed` and `bun dev` can't open the database on macOS. There's no Prettier config in the repo.
- **Left for later:** seeding an empty database on first Docker boot (devops.md mentions it), and typo-tolerant search.

## Seed on boot (2026-10-13)

<!-- Draft by the AI for me to edit. -->

- **Asked for:** a fresh `docker compose up` that shows data without a manual seed, as devops.md already promised. **I chose** a separate small change rather than folding it into CRUD.
- **I decided:** seeding is opt-in through `SEED_IF_EMPTY`, on only in Compose. The AI pointed out that "seed whenever empty" would bring back 10,000 fake people after HR deletes everyone, once CRUD exists.
- **Built test-first:** config parsing (only `true`/`false`, anything else stops startup) and `seedIfEmpty` (identical rows to `bun run seed`, untouched when data exists).
- **Checked in Docker** under a separate Compose project, so the fresh volume it needed didn't wipe my existing one.

## Add, edit, and delete employees (2026-10-13)

<!-- Draft by the AI for me to edit. -->

- **Asked for:** requirement #2. The AI drafted the spec with four open questions.
- **I decided:** departments are a fixed list; delete removes the row; future hire dates are rejected. The AI took its recommendation for the salary format (a decimal string in major units) since I didn't pick, and proposed making countries a fixed list too so the form can pre-fill the currency; I approved it with the plan.
- **Schema:** `departments` and `countries` tables, enforced by triggers because SQLite can't add a foreign key to an existing column without rebuilding the table.
- **Built test-first** in four slices. Salary parsing uses string arithmetic only, so no float ever holds a salary; every invalid field is reported at once.
- **AI corrections:**
  - The shadcn CLI again added `cn` and `radix-ui` for Dialog, and for AlertDialog it stopped at a prompt to overwrite `button.tsx`. The AI removed the packages and wrote `alert-dialog.tsx` by hand.
  - It pulled the form-options endpoint forward from Slice 4 when the add form needed it, and noted the change.
  - It gave the route tests a fixed clock once "no future hire dates" made them depend on the real date.

## Dashboard (2026-10-13)

<!-- Draft by the AI for me to edit. -->

- **Asked for:** a dashboard with the stats HR needs most, with filters, as the first page. **I added** total payroll, pay per department, hires in the last 12 months, and average tenure, and asked for **charts and graphs**, not just text.
- **I chose Recharts** (through shadcn's Chart) over hand-built SVG, recorded as ADR-006.
- **I pushed on query design** so I can defend it in an interview. The AI benchmarked four approaches on the seeded data instead of assuming: one sorted query grouped in code took 5.2 ms; window-function medians in SQL took 37–57 ms; SQL `GROUP BY` without medians took 6.9 ms. Embedded SQLite has no network hop to save, and medians in SQL need a sort per group. Recorded as ADR-007, with when the answer would flip (Postgres over a network, millions of rows).
- **I asked for caching without stale data.** The AI prototyped SQLite's own counters first (`total_changes()` for this connection, `PRAGMA data_version` for others), showed every kind of write moves them, and kept today's date in the key for the date-based figures. The version is read before the query. Recorded as ADR-008; tests break the invalidation on purpose to prove they'd catch it.
- **Built test-first** in seven slices, plus a 10,000-row performance test (6.4 ms uncached).
- **AI corrections:**
  - Its first charts showed no bars in screenshots: a full-page capture resizes the window and restarts the animation. It measured the bars instead of guessing, then switched to viewport captures.
  - The charts' screen-reader lists made the whole page scrollable; it measured the document height and made each figure `position: relative`.
  - The Median and Average labels collided in the same band, and the histogram's axis labels ran together; it merged the markers and shortened the ticks.
  - shadcn's chart file failed the strict lint; it trimmed it to what's used rather than loosening the lint.
  - The shadcn CLI again added `cn`, `lucide-react`, an unrequested `card.tsx`, and an unpinned older Recharts; all removed or pinned.

## Login rate limiting (2026-10-13)

<!-- Draft by the AI for me to edit. -->

- **Asked for:** continue after the dashboard. The AI picked login rate limiting before the nice-to-haves because ADR-003 requires it before real data goes in.
- **Design points it raised and I approved:** count failures only; refuse even the right password while limited, so a guess can't be confirmed; key by client address, not by account, so nobody can lock the only HR user out on purpose.
- **Behind the proxy:** every request reaches the API from Caddy, so keying on the connection address would put all users in one bucket. With `TRUST_PROXY=true` (Compose only) the API uses the last `X-Forwarded-For` entry, the one Caddy adds; earlier entries can be forged. Checked in Docker with spoofed headers.
- **Built test-first** with an injected clock, so the 15-minute window is tested without waiting.
- **AI corrections:** a formatter run touched three unrelated auth test files; it restored them so the diff only holds the change.

## Original currency (2026-10-13)

<!-- Draft by the AI for me to edit. -->

- **Asked for:** the nice-to-have "salaries in their original currency alongside the USD figure in the insight tables".
- **Design point the AI raised:** an original-currency figure only means something when the whole row is paid in one currency, so mixed rows show USD only; filtering to one country makes department and job-title rows single-currency. Local figures come from the stored amounts, never converted back from USD (a test catches the rounding difference).
- **I asked about live exchange rates** for a "real-time" app. The AI laid out the trade-off (salaries are annual; official rates publish daily; live numbers would shift between page loads) and proposed a daily European Central Bank refresh that the cache would pick up automatically. **I decided to keep the fixed snapshot for now.**
- **Built test-first;** the same single query and pass as ADR-007.
- **After the browser check** it hid the repeated line for USD rows ("$97,000" over "$97,000.00").

## Login rate limit removed (2026-10-16)

<!-- Draft by the AI for me to edit. -->

- **Asked for:** remove the login rate limit.
- **Removed with it:** everything that existed only for the limiter: `TRUST_PROXY`, the client-address helper, the `too_many_attempts` error code, and Caddy's `X-Real-IP` header and trusted-proxies block. ADR-003 now says login has no rate limit.
