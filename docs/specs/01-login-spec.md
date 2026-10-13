# Spec: Login
Risk: HIGH
Requirement: [requirements.md → Must have](../requirements.md#must-have-mvp) ("Login for the HR manager"), decisions in [ADR-003](../adrs/003-stateless-jwt-auth.md)

## Overview
The HR manager signs in with one email and password before seeing any salary data. The session is a signed token in an httpOnly cookie, so the server stores no session state.

## Slice 1: HR can log in (walking skeleton)
- [x] On startup, the server creates the single demo HR account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, or resets it to those values if it already exists, so the published demo credentials always work
- [x] The stored password is an argon2id hash, never the plain text
- [x] `POST /api/login` with the correct email and password returns `200` with `{ email }`
- [x] A successful login sets a `session` cookie that is `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, with `Max-Age` of 8 hours
- [x] The email is stored in lowercase
- [x] Login matches the email regardless of letter case and surrounding spaces
- [x] A wrong password returns `401` `{ error: { code: "invalid_credentials", message: "Email or password is incorrect" } }` and sets no cookie
- [x] An unknown email returns exactly the same `401` response as a wrong password
- [x] A missing or non-string `email` or `password` returns `400` with a message for each bad field in `details`
- [x] The login form submits email and password and then shows the app shell with the user's email in the header
- [x] A rejected login shows "Email or password is incorrect" on the form and keeps the typed email
- [x] The submit button is disabled while the login request is in flight

## Slice 2: The session protects the API
- [x] `GET /api/me` with a valid session cookie returns `200` with `{ email }`
- [x] `GET /api/me` returns `401` `{ error: { code: "unauthenticated", ... } }` when the cookie is missing
- [x] It returns the same `401` when the token is malformed, its signature was tampered with, it was signed with a different secret, or its algorithm isn't HS256 (including `none`)
- [x] It returns the same `401` when the token is more than 8 hours old
- [x] Reloading the page while logged in shows the app, not the login form

## Slice 3: HR can log out
- [x] `POST /api/logout` returns `204` and expires the `session` cookie
- [x] Clicking "Log out" in the header returns to the login form
- [x] Any API call answered with `401` returns the UI to the login form

## API shape (indicative)
```
POST /api/login   { email, password } → 200 { email }  + Set-Cookie: session=…
                                       → 400 { error: { code: "validation", details } }
                                       → 401 { error: { code: "invalid_credentials" } }
GET  /api/me                           → 200 { email } | 401 { error: { code: "unauthenticated" } }
POST /api/logout                       → 204           + Set-Cookie: session=; Max-Age=0
```

## Out of scope
- Login rate limiting. ADR-003 lists it as a must-have before real data goes in, as its own change.
- Revoking tokens before they expire (denylist, refresh tokens).
- Sign-up or creating accounts in the app, changing or resetting the password, "remember me", more than one user, and roles. The demo account is managed only through env vars, and its credentials are shared with reviewers outside the app (not shown on the login page).
- CSRF tokens. `SameSite=Strict` on a single origin covers it (ADR-003, ADR-005).
- Sentry wiring (ADR-004), as its own change.

---
- [x] Reviewed
