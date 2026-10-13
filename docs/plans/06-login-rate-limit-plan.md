# Plan: Login rate limiting
Spec: [06-login-rate-limit-spec.md](../specs/06-login-rate-limit-spec.md) · Decision: [ADR-003](../adrs/003-stateless-jwt-auth.md)

## Slice 1: Failed logins are limited per client

- **Design intent:** a pure, clock-injected limiter; the login route asks it before checking the password and tells it about each failure or success.
- **API contract:** `shared/error-codes.ts` gains `tooManyAttempts: "too_many_attempts"` (an API contract change: the web already shows any error's message).
- **Backend:**
  - `auth/login-limiter.ts` (pure): `createLoginLimiter({ maxFailures: 5, windowMs: 15 * 60_000, maxClients: 10_000 })` → `{ check(client, now): { allowed: true } | { allowed: false; retryAfterSeconds: number }; fail(client, now): void; succeed(client): void }`. A `Map<client, { count, windowStart }>`; an entry whose window has passed counts as empty and is deleted when seen.
  - `auth/auth.routes.ts`: one limiter per `authRoutes(...)` call (so test servers start clean). Order: validate body (`400` doesn't count) → `check` → `429` with `Retry-After` → verify password → `fail` or `succeed`.
  - `auth/auth.constants.ts`: the message and the limits.
  - The client key comes from `req` + `server.requestIP(req)` (Slice 1 uses the connection address only).
- **Frontend:** none (LoginPage already shows the error message).
- **Libraries added:** none.
- **Test list:**
  - [x] unit `login-limiter`: 5 failures allowed, the 6th check blocked with `retryAfterSeconds` counting down from 900 · after the window, allowed again · `succeed` clears · clients independent · `check` doesn't count as a failure
  - [x] integration `auth.routes`: 5 wrong passwords → `401` each, the 6th → `429` with `Retry-After` and code `too_many_attempts` · correct password while limited → `429`, no cookie · advance the injected clock 15 minutes → `401` again · a success clears earlier failures · a `400` body doesn't count
  - [x] component `LoginPage`: a `429` shows its message (already true for any `ApiError`; one test pins it)
- **Quality checks:** the password is never checked while limited · the limiter has no I/O and takes `now`

## Slice 2: The right client is identified behind the proxy

- **Backend:**
  - `config.ts`: `trustProxy: boolean` from `TRUST_PROXY` (same `true`/`false` parsing as `SEED_IF_EMPTY`).
  - `http/client-address.ts` (pure): `clientAddress(forwardedFor: string | null, connectionAddress: string | null, trustProxy: boolean): string`. Trusted: the last non-empty entry of `X-Forwarded-For`; otherwise the connection address; `"unknown"` if neither.
  - `limiter`: `maxClients` cap; when full, the oldest entry (Map insertion order) is dropped.
- **Wiring:** `docker-compose.yml` → `api.environment.TRUST_PROXY: "true"`; devops.md env table.
- **Test list:**
  - [x] unit `client-address`: trusted → last `X-Forwarded-For` entry (`"1.1.1.1, 2.2.2.2"` → `2.2.2.2`) · untrusted → connection address even if the header is present · trims spaces · neither → `"unknown"`
  - [x] unit `config`: `TRUST_PROXY` unset → false, `"true"` → true, `"yes"` → throws
  - [x] unit `login-limiter`: past `maxClients`, the oldest client is dropped
  - [x] manual (Docker): 6 bad logins → 429; a spoofed `X-Forwarded-For` from the same client still gets 429 (Caddy replaces it)
- **Quality checks:** the header is ignored unless `TRUST_PROXY=true`

## As built

Built on branch `feat/login-rate-limit`. `bun run check` passes with 290 server and 86 web tests.

**Files:** `auth/login-limiter.ts`, `http/client-address.ts`, `auth/auth.routes.ts` (check before the password, `fail`/`succeed` after), `auth/auth.constants.ts` (`LOGIN_LIMITS`, message), `config.ts` (`trustProxy`), `shared/error-codes.ts` (`too_many_attempts`), `docker-compose.yml`, `devops.md`.

**Checked in Docker:** 5 bad logins → `401`; the 6th → `429` with `Retry-After: 900`; spoofed `X-Forwarded-For: 5.5.5.5` and `1.2.3.4, 5.5.5.5` from the same client → still `429` (Caddy appends the real address last); a second client inside the Docker network → `401`, not limited. The API was restarted afterwards to clear the counts.

**Differences from the plan:** none in behaviour. The memory cap evicts the oldest client when a new one is added past 10,000 (Map insertion order), so the cap is enforced on `fail`, the only place entries are created.

---
- [x] Reviewed
