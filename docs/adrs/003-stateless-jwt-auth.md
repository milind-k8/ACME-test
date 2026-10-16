# ADR-003: Stateless JWT authentication in an httpOnly cookie

**Status:** Accepted · 2026-10-13

## Context
This is salary data, and it will be deployed at a public URL. The first draft left auth out "for the timebox", and I reversed that. There's one persona (the HR manager), so I need one account and no roles.

## Decision
- One HR account, seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Passwords are hashed with Bun's built-in `Bun.password` (argon2id). Its `verify` compares in constant time.
- Login issues a JWT (HS256 via `jose`, 8-hour expiry) in an `httpOnly; Secure; SameSite=Strict` cookie.
- A `withAuth` wrapper verifies the token on every `/api/*` route except login. The server stores no session.
- Wrong email and wrong password return the same `401` message.

## Alternatives considered
- **Server-side sessions table.** Easy to revoke, but every request needs a DB lookup, and it isn't what I set out to build (stateless).
- **JWT in localStorage with a Bearer header.** Simpler to call from tools, but any XSS bug could read the token.
- **No auth.** Not acceptable for salary data at a public URL.

## Consequences
- Logout only clears the cookie. A stolen token stays valid until it expires (at most 8 hours). If that risk matters, add a denylist or short-lived access tokens with refresh tokens.
- Login has no rate limit. One was built ([spec 06](../specs/06-login-rate-limit-spec.md)) and removed on 2026-10-16 at my request; password guessing is limited only by argon2's cost per attempt.
- `JWT_SECRET` is required, and the server refuses to start in production without it.
