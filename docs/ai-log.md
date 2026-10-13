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
