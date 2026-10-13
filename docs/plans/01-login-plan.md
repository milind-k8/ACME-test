# Plan: Login
Spec: [01-login-spec.md](../specs/01-login-spec.md) · Decisions: [ADR-003](../adrs/003-stateless-jwt-auth.md), [ADR-005](../adrs/005-separate-web-and-api-packages.md)

This is the first feature, so Slice 1 is also the walking skeleton for the whole app. It adds `packages/shared`, the DB connection and migrations, the error shape, and the test server.

## Slice 1: HR can log in (walking skeleton)

- **Design intent:** the thinnest path from the login form to the API and the `users` table and back. The server checks credentials and issues the cookie. The UI keeps the user in React state (a reload goes back to login until Slice 2).
- **API contract** (`packages/shared/src/api-types.ts`, new package `@smt/shared`):
  ```ts
  export interface ApiErrorBody { error: { code: string; message: string; details?: Record<string, string> } }
  export interface LoginRequest { email: string; password: string }
  export interface SessionUser { email: string }
  ```
- **Backend:**
  - Migration `db/migrations/001_users.sql`:
    ```sql
    CREATE TABLE users (
      id            INTEGER PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE CHECK (length(email) > 0 AND email = lower(trim(email))),
      password_hash TEXT NOT NULL
    ) STRICT;
    ```
  - `config.ts`: add `databasePath` (default `smt.db`), `adminEmail`, and `adminPassword`. `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are required in every environment, not only production. There are no dev defaults.
  - `packages/server/package.json`: the `dev` script becomes `bun --hot --env-file=../../.env src/index.ts`, so dev reads the root `.env` (wiring).
  - `db/connection.ts`: `openDatabase(path: string): Database`. It sets the PRAGMAs from backend.md and runs migrations.
  - `db/migrate.ts`: `migrate(db: Database, dir?: string): void`. It applies `migrations/*.sql` in order and records each in `schema_migrations`.
  - `http/responses.ts`: `json(body, status?)`, `error(status, code, message, details?)`, `notFound()`, `unexpected(err)`
  - `auth/users.repository.ts`: `findByEmail(db, email): { id: number; email: string; passwordHash: string } | null`, `upsertUser(db, email, passwordHash): void`
  - `auth/admin.ts`: `ensureAdmin(db, email, password): Promise<void>`. It normalises the email, hashes with `Bun.password.hash` (argon2id), and upserts. Env is the only source of truth for the demo account; there is no in-app way to change it.
  - `auth/token.ts`: `signToken(user: SessionUser, secret: string, now: Date): Promise<string>`. HS256, `exp` = now + 8h.
  - `auth/validate-login.ts`: pure. `normalizeEmail(email: string): string` (trim + lowercase, also used by `ensureAdmin`) and `validateLogin(body: unknown): { ok: true; value: LoginRequest } | { ok: false; errors: Record<string, string> }`.
  - `auth/auth.routes.ts`: `authRoutes(db, config, now: () => Date)` → `{ "/api/login": { POST } }`. An unknown email still runs `Bun.password.verify` against a dummy hash, so its response time matches a wrong password. The cookie is set with `req.cookies.set(...)`.
  - `routes.ts`: `createRoutes(db, config, now = () => new Date())`. `index.ts` wires `openDatabase`, `ensureAdmin`, `createRoutes`, and `error: unexpected`.
  - `test-support/test-server.ts`: `startTestServer({ now? }) → { url, db, loginCookie, stop }`. Port 0, `:memory:`, and a fixed admin and secret.
- **Frontend:**
  - Run `shadcn init` (neutral) and add `Button`, `Input`, `Label`, `Card` → `components/ui/`, `lib/utils.ts`
  - `lib/api.ts`: `class ApiError extends Error { status; code; details? }`, `api<T>(path: string, init?: RequestInit): Promise<T>`. It sends JSON with `credentials: "same-origin"` and turns any non-2xx response into an `ApiError`.
  - `features/auth/auth.api.ts`: `login(req: LoginRequest): Promise<SessionUser>`
  - `features/auth/LoginPage.tsx`: `LoginPage({ onLoggedIn }: { onLoggedIn(user: SessionUser): void })`. A plain `<form>` with `type="email"` and `required`, an error shown as `role="alert"` text (not colour alone), and the button disabled while submitting.
  - `components/AppShell.tsx`: `AppShell({ user, children })`. The header shows the email; the nav comes with Employees.
  - `App.tsx`: the auth gate. No user → `LoginPage`, user → `AppShell`.
- **Libraries added:**
  - server: `jose` (already on the allowed list; security-critical, so audited library per process doc)
  - web: shadcn's peers for the four components: `@radix-ui/react-slot`, `@radix-ui/react-label`, `class-variance-authority`, `clsx`, `tailwind-merge`. All are already on frontend.md's allowed list.
  - shared: none
- **Test list:**
  - [x] unit `config`: throws when `JWT_SECRET`, `ADMIN_EMAIL`, or `ADMIN_PASSWORD` is missing, in any `NODE_ENV` (this replaces the production-only test; the port tests get a full env) · `databasePath` defaults to `smt.db`
  - [x] unit `validate-login`: missing email → error · missing password → error · non-string values → error · email trimmed and lowercased
  - [x] unit `token`: a signed token decodes with the email and an `exp` 8h after `now`
  - [x] integration `migrate`: applies `001` once, and a second run is a no-op
  - [x] integration `connection`: `sqlite_version() >= 3.37`, FTS5 available, `foreign_keys` on (the walking-skeleton checks from backend.md)
  - [x] integration `users.repository`: upsert inserts, then upsert updates the hash · a non-lowercase email is rejected by the `CHECK`
  - [x] integration `admin`: the stored hash starts with `$argon2id$` and verifies against the password · `" HR@Acme.test "` is stored as `hr@acme.test` · a second run with a new password replaces the hash
  - [x] integration `auth.routes`: correct credentials → 200 `{ email }` · cookie flags and `Max-Age=28800` · `" HR@Acme.test "` logs in · wrong password → 401 and no `Set-Cookie` · unknown email → identical 401 body · bad body → 400 with `details`
  - [x] integration `responses`: a throwing route → 500 with a generic message and no stack trace
  - [x] unit `lib/api`: a non-2xx `{ error }` body → `ApiError` with status, code, and details (stub `fetch`)
  - [x] component `LoginPage`: submit calls `login` with the typed values · 401 shows the message and keeps the email · button disabled while pending
  - [x] component `App`: a successful login shows the shell with the email (replaces the current title test)
- **Quality checks:** routes contain no SQL · password never logged or returned · `token.ts` and `validate-login.ts` have no I/O · `users` is `STRICT`

## Slice 2: The session protects the API

- **Design intent:** `withAuth` is the single gate that every later `/api/*` route goes through. `/me` lets the UI restore the session after a reload. The clock is injected, so expiry is tested deterministically.
- **API contract:** none new (`GET /api/me` returns `SessionUser`)
- **Backend:**
  - `auth/token.ts`: `verifyToken(token: string, secret: string, now: Date): Promise<SessionUser | null>`. It uses `jwtVerify` with `algorithms: ["HS256"]` and `currentDate: now`, and returns `null` on any failure.
  - `http/with-auth.ts`: `withAuth(config, now, handler: (req: BunRequest, user: SessionUser) => Response | Promise<Response>)`. It returns `401 unauthenticated` when `verifyToken` gives `null`.
  - `auth/auth.routes.ts`: add `"/api/me": { GET: withAuth(...) }`
- **Frontend:**
  - `features/auth/auth.api.ts`: `getMe(): Promise<SessionUser>`
  - `features/auth/useSession.ts`: `useSession(): { status: "loading" | "anonymous" | "authenticated"; user?: SessionUser; setUser(u: SessionUser): void }`. It calls `getMe` on mount.
  - `App.tsx`: render `Skeleton` while loading
- **Libraries added:** shadcn `Skeleton` (no new dependency)
- **Test list:**
  - [x] unit `token`: tampered payload → null · different secret → null · `alg: none` → null · `alg: HS512` → null · `now` = exp + 1s → null · garbage string → null
  - [x] integration `auth.routes`: `/me` with `loginCookie` → 200 `{ email }` · no cookie → 401 · expired (test server `now` advanced 8h) → 401
  - [x] component `App`: `getMe` resolves → shell shown · `getMe` rejects 401 → login form · loading → skeleton
- **Quality checks:** the algorithm is pinned in verify · `withAuth` holds the only token check · no DB lookup per request

## Slice 3: HR can log out

- **Design intent:** clearing the cookie is all a logout can do with stateless tokens (ADR-003). Any `401` anywhere sends the UI back to login.
- **API contract:** none new
- **Backend:** `auth/auth.routes.ts`: add `"/api/logout": { POST }`. It calls `req.cookies.delete("session", { path: "/" })` and returns `204`. It is **not** wrapped in `withAuth`, so an expired session can still log out cleanly. *(This departs from ADR-003's "every route except login". Approve it, or I'll wrap it.)*
- **Frontend:**
  - `features/auth/auth.api.ts`: `logout(): Promise<void>`
  - `lib/api.ts`: `onUnauthorized(listener: () => void): () => void`. It runs on any 401 except from `/api/login`.
  - `useSession`: subscribe to `onUnauthorized` and add `logout()`
  - `AppShell`: a "Log out" button in the header
- **Libraries added:** none
- **Test list:**
  - [x] integration `auth.routes`: logout → 204 and `Set-Cookie` with `Max-Age=0`
  - [x] unit `lib/api`: a 401 notifies listeners · a 401 from `/api/login` doesn't
  - [x] component `App`: clicking Log out → login form · an `onUnauthorized` event → login form
- **Quality checks:** no token kept in JS-readable storage

## Decisions
- **Demo account:** one account, upserted from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on every start. The published credentials always work, and no endpoint changes them.
- **Emails:** stored lowercase. `normalizeEmail` handles it in code, and a `CHECK` enforces it in the schema.
- **`Secure` cookie:** always on, with no `NODE_ENV` toggle. Browsers treat `http://localhost` as a secure context, so it works in dev and Compose. Production runs on HTTPS (Caddy).

- **Secrets:** you set `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env` (dev and Compose) and in the deploy environment. The server refuses to start without them.

## Open questions
1. ~~**Test speed:**~~ Resolved: one argon2id hash takes about 120 ms, so `test-server.ts` hashes the admin password once per test process. The production cost is unchanged.

## As built

Built on branch `feat/login` across all three slices. `bun run check` passes with 60 server and 16 web tests, a production build, and no vulnerabilities.

**Files**
- shared: `packages/shared/` (new workspace package; `api-types.ts` with `ApiErrorBody`, `LoginRequest`, `SessionUser`)
- server:
  - `config.ts`
  - `db/connection.ts`, `db/migrate.ts`, `db/migrations/001_users.sql`
  - `http/responses.ts`, `http/with-auth.ts`
  - `auth/validate-login.ts`, `auth/users.repository.ts`, `auth/admin.ts`, `auth/token.ts`, `auth/auth.routes.ts`
  - `routes.ts`, `index.ts`, `test-support/test-server.ts`
- web:
  - `lib/api.ts`, `lib/utils.ts`
  - `components/ui/{button,input,label,card,skeleton}.tsx`, `components/AppShell.tsx`
  - `features/auth/{auth.api.ts,LoginPage.tsx,useSession.ts}`, `App.tsx`
  - `index.css` (neutral theme, indigo `--primary`), `components.json`, the `@/*` path alias
- wiring:
  - Both Dockerfiles copy `packages/shared`.
  - The `dev` script reads the root `.env`.
  - Compose sets `DATABASE_PATH=/app/data/smt.db`, so `.env.example` no longer has it.
  - `devops.md` and `README.md` env tables are updated.

**Migrations:** `001_users.sql`, as planned.

**Libraries:**
- server: `jose` 6.2.12
- web: `@radix-ui/react-slot` 1.5.0, `@radix-ui/react-label` 2.1.17, `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0
- All are pinned exact.

**Differences from the plan, and why**
- **No `shadcn init`.** Its init is built around app templates and presets, so `components.json` was written by hand. `shadcn add` (4.21.4) twice imported `cn` from an unrelated npm package named `cn` and installed it, and it also used the all-in-one `radix-ui` package. Both times the dependency changes were reverted and the imports fixed to `@/lib/utils` and `@radix-ui/react-*`. Check the `cn` import after every `shadcn add`.
- **Logout clears the cookie with `set("session", "", { ...same attributes, maxAge: 0 })`, not `cookies.delete`.** Bun's `delete` sends `SameSite=Lax` without `Secure` or `HttpOnly`, which doesn't match the cookie login sets. Logout is not behind `withAuth`, as planned.
- **`api()` grew three behaviours the plan didn't list**, each test-driven:
  - A non-JSON error body (a proxy 502 page) becomes `ApiError(status, "unknown")`.
  - A network failure becomes `ApiError(0, "network")`.
  - A `204` resolves to `undefined`.
- **`api()` always sends `Content-Type: application/json` and ignores caller headers.** Merging `HeadersInit` safely wasn't needed (YAGNI).
- **`useSession` treats any `ApiError` from `/api/me` as anonymous**, not only a 401. If the API is down, the login form shows, and submitting it shows "Can't reach the server".
- **`AppShell` takes `{ user, onLogout }`, with no `children` yet.** There's no content until Employees.
- **`startTestServer` is async** (it signs `loginCookie`) and exports `TEST_ADMIN` and `TEST_CONFIG`.
- **Extra tests beyond the list:**
  - `migrate`: multi-statement files, and rollback when a migration fails
  - `verifyToken`: a token with no `email` claim
  - `validateLogin`: a body that isn't an object
- **Guard tests that passed on first run were mutation-checked.** The `users` CHECK, the `withAuth` 401s, and the `onUnauthorized` login exclusion and unsubscribe were each broken on purpose to confirm their tests fail.

---
- [x] Reviewed
