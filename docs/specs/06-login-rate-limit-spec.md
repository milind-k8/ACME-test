# Spec: Login rate limiting
**Removed 2026-10-16** at my request (see [ADR-003](../adrs/003-stateless-jwt-auth.md#consequences)). Kept for history.

Risk: HIGH
Requirement: [ADR-003 → Consequences](../adrs/003-stateless-jwt-auth.md#consequences) ("Before real data goes in, add a small in-memory limiter keyed by IP"), [requirements.md → Must have](../requirements.md#must-have-mvp) ("This is salary data, so it shouldn't be open to anyone with the URL")

## Overview
Stop password guessing against the HR login. After a few failed attempts from one client, further attempts are refused for a while, with a clear message and a `Retry-After` header. The real user, who mistypes once or twice and then gets it right, never notices.

## Slice 1: Failed logins are limited per client
- [x] 5 failed logins from one client within 15 minutes are answered normally (`401`)
- [x] The 6th attempt within that window returns `429` `{ error: { code: "too_many_attempts", message } }` with a `Retry-After` header in seconds, without checking the password
- [x] While limited, even the correct password gets `429`, so a guess can't be confirmed
- [x] Once 15 minutes have passed since the first counted failure, the client can try again
- [x] A successful login clears that client's failures
- [x] Failures from one client don't limit another
- [x] Validation errors (`400`, e.g. a missing password) don't count as failures
- [x] The login form shows the server's message ("Too many login attempts. Try again in 15 minutes.")

## Slice 2: The right client is identified behind the proxy
- [x] With `TRUST_PROXY=true`, the client is the last address in `X-Forwarded-For` (the one Caddy adds); otherwise it's the connection's address
- [x] `TRUST_PROXY` other than `true`/`false` stops the server at startup
- [x] Compose sets `TRUST_PROXY=true`; in Docker, two clients with different addresses are limited separately, and a client can't reset its count by sending its own `X-Forwarded-For`
- [x] The limiter's memory stays bounded: expired entries are dropped, and at most 10,000 clients are tracked

## API shape (indicative)
```
POST /api/login → 429 { error: { code: "too_many_attempts", message: "Too many login attempts. Try again in 15 minutes." } }
                  Retry-After: <seconds>
```

## Decisions
- **Count failures, not requests**, so normal use is never limited.
- **Key by client address only, not by account.** Locking the account itself would let anyone lock the single HR user out by guessing wrong on purpose.
- **In memory, per process** (ADR-003). Restarting the API clears it; acceptable for one API process.

## Out of scope
- Rate limits on other endpoints.
- CAPTCHA, account lockout, or alerting on repeated failures.
- A shared store (Redis) for several API processes.

---
- [x] Reviewed
