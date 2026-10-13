# ADR-005: Separate web and API packages (Bun workspaces)

**Status:** Accepted · 2026-10-13 · Supersedes the "one `package.json`, one process" packaging in [devops.md](../devops.md) (ADR-001's runtime choices still stand)

## Context
The first scaffold followed devops.md: one `package.json`, one Bun process serving both the API and the React app. I want the frontend and backend as separate environments, each with its own dependencies, so either one can be built, run, and deployed without the other.

## Decision
- **Bun workspaces**: `packages/server` (`@smt/server`), `packages/web` (`@smt/web`), and later `packages/shared` (`@smt/shared`) when the first API type lands. One root `bun.lock`; shared dev tooling (TypeScript, ESLint, Prettier) lives at the root.
- Each package has its own `package.json`, `tsconfig.json`, scripts, and `Dockerfile`. They never import each other, only `@smt/shared`. ESLint `no-restricted-imports` enforces this.
- **Two containers.** `api` runs `bun src/index.ts` and is not published to the host. `web` is a static build served by Caddy, which also reverse-proxies `/api/*` to `api:3000`.
- **One origin for the browser**, in dev too: the web dev server (`packages/web/dev-server.ts`) proxies `/api/*` to the API. So there's no CORS, and the `SameSite=Strict` cookie from ADR-003 works unchanged.
- The web build uses `Bun.build` with `bun-plugin-tailwind` in `build.ts`, because the `bun build` CLI ignores bunfig's `[serve.static]` plugins.

## Alternatives considered
- **Fully independent folders, each with its own lockfile.** The shared API types would have to be copied or published, so the contract could drift.
- **Separate origins + CORS.** The cookie would need `SameSite=None`, which weakens ADR-003.
- **Switching to Node.js.** Not needed for the split; ADR-001's reasons still hold.

## Consequences
- Two containers and two Dockerfiles. Both build from the repo root, because the lockfile is shared.
- Caddy is now part of the base setup, not only production. HTTPS at deploy time means changing the site address in `packages/web/Caddyfile` and publishing 80/443.
- `bun dev` at the root runs both dev servers. The app is on :5173 in dev and :3000 in Compose.
