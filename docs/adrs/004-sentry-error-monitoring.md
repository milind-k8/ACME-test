# ADR-004: Sentry for production error monitoring

**Status:** Accepted · 2026-10-13

## Context
The app runs at a public URL with nobody watching the logs. If a request fails or a screen crashes in production, I want to know without waiting for the HR manager to report it. The data is salaries, so error reports must not carry it out.

## Decision
- `@sentry/bun` on the server and `@sentry/react` in the browser.
- Enabled only when a DSN is set (`SENTRY_DSN`, `BUN_PUBLIC_SENTRY_DSN`), which is production only. Dev and tests make no network calls.
- Only unexpected errors are reported: server `500`s and frontend render crashes. Expected `4xx` responses are not.
- `sendDefaultPii: false`, and no request or response bodies on events, so no salary data reaches Sentry.
- On the frontend, `Sentry.ErrorBoundary` is the error boundary, so there's no hand-written boundary class.

## Alternatives considered
- **Logs only.** No new dependency, but nobody reads the server logs proactively, and browser crashes never reach them.
- **A self-written `window.onerror` + log endpoint.** A few lines to start with, but no grouping, alerting, or stack traces, and it becomes its own small product.

## Consequences
- Two new runtime dependencies and an external service in production.
- Minified browser stack traces are hard to read. Uploading source maps to Sentry is the next step if that gets in the way.
- Any new code that attaches context to Sentry events must not include salary fields.
