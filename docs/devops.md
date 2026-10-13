# DevOps

How the app is configured, built, run, and deployed. Read [development-process.md](development-process.md) first.

## Packaging

- **Bun workspaces** ([ADR-005](adrs/005-separate-web-and-api-packages.md)): `packages/server` (`@smt/server`), `packages/web` (`@smt/web`), and `packages/shared` (`@smt/shared`, added with the first API type). One root `bun.lock`. Each package has its own `package.json`, `tsconfig.json`, and `Dockerfile`.
- The browser always sees one origin: Caddy (in Compose) and `packages/web/dev-server.ts` (in dev) proxy `/api/*` to the API. No CORS, and the `SameSite=Strict` cookie just works.
- Bun version is pinned (`packageManager: bun@1.4.3`, Docker `oven/bun:1.4.3-slim`). Caddy is pinned to `caddy:2.11.7-alpine`.
- Root files: `package.json`, `bun.lock`, `tsconfig.base.json`, `eslint.config.js`, `docker-compose.yml`, `.env.example`.
- Dev tooling dependencies (root): `typescript`, `@types/bun`, `eslint`, `typescript-eslint` (needed for ESLint to read TypeScript and for the no-`any` rules), `prettier`.
- **TypeScript is pinned to 6.0.x**, not 7: typescript-eslint 8.71 supports `typescript <6.1.0`. Move to 7 once typescript-eslint supports it.

## Commands

| Command | What it does |
|---------|--------------|
| `bun install` | Install dependencies |
| `bun dev` | Start the API (:3000) and web dev server (:5173, proxies `/api`) with hot reload |
| `bun test` | Run all tests |
| `bun run seed` | Reset the database and seed 10,000 employees |
| `bun run backup` | Write a consistent copy of the database to `data/backups/` |
| `bun run lint` / `bun run typecheck` | ESLint / `tsc --noEmit` |
| `bun run build` | Production build of the web app (`packages/web/dist`). The API runs its TypeScript directly |
| `bun audit` | Check installed dependencies against known vulnerabilities (CVEs) |
| `bun run check` | All gates in one go: lint, typecheck, test, build, audit |

## Quality gates

`bun run check` runs every gate and stops at the first failure. It must pass before every commit (the definition of done) and before every deploy.

| Gate | Fails when |
|------|-----------|
| `bun run lint` | ESLint error, including a broken import rule |
| `bun run typecheck` | Any TypeScript error (`tsc --noEmit`, strict) |
| `bun test` | Any failing test |
| `bun run build` | The production bundle doesn't build. A build error is fixed like a failing test, never skipped |
| `bun audit --audit-level=high` | A dependency has a known **high or critical** vulnerability |

**Vulnerabilities:**
- **High / critical:** fix before the next commit or deploy. Upgrade the package (or the package that pulls it in), run `bun run check`, and commit as `fix(deps): …`. If no fixed version exists yet, write down why the risk is acceptable for now in the plan or an ADR, and check again weekly.
- **Moderate / low:** fix in the next dependency update.
- **Dependency updates:** `bun outdated` once a month. Upgrade one package per commit, so a breaking change is easy to find.
- **Docker images:** the base images are pinned (`oven/bun:1.4.3-slim`, `caddy:2.11.7-alpine`) and rebuilt on each deploy, so it picks up OS security patches.
- `bun.lock` is always committed, so every install gets the exact versions that were audited.

## Environment variables

| Variable | Notes |
|----------|-------|
| `JWT_SECRET` | Required in every environment; the server refuses to start without it |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Required. The single demo HR account, reset to these values on every start |
| `DATABASE_PATH` | SQLite file path. Defaults to `smt.db`; Compose sets `/app/data/smt.db` |
| `PORT` | Defaults to 3000 |
| `SEED_IF_EMPTY` | `true` seeds the 10,000 demo employees at startup if the table is empty. Off by default; only Compose turns it on, so a real deployment never gets demo data |
| `SENTRY_DSN` | Server error reporting. Set in production only; unset means Sentry is off |
| `BUN_PUBLIC_SENTRY_DSN` | Browser error reporting, inlined into the bundle at build time. Production only |

`.env` is never committed. `config.ts` reads and validates these once at startup.

## Docker Compose

Two services, both built from the repo root (see `docker-compose.yml`):

| Service | Image | Role |
|---------|-------|------|
| `api` | `packages/server/Dockerfile` (Bun, non-root `bun` user) | Runs the API on 3000, internal only. SQLite file on the `data` volume |
| `web` | `packages/web/Dockerfile` (Bun build stage → Caddy) | Serves the built SPA and proxies `/api/*` to `api:3000`. Published on host port 3000 |

- `cp .env.example .env`, then `docker compose up --build`, then open http://localhost:3000. On first boot the API creates the schema and, because Compose sets `SEED_IF_EMPTY=true`, seeds 10,000 employees into the empty database.
- No database container, because SQLite is a file.

## Deployment

A single **VPS** running the same Docker Compose setup. Backend and frontend deploy together with one `docker compose up`; the `web` container serves the SPA and proxies the API, so it's one origin (see Packaging). Not a PaaS: SQLite is a file and needs a persistent disk, and a VPS gives that with no platform lock-in. Serverless hosts (e.g. Vercel) are ruled out because their filesystem is ephemeral.

**HTTPS** is required: the auth cookie is `Secure` (ADR-003) and won't be sent over plain HTTP. The `web` container is already Caddy. For production, set its site address in `packages/web/Caddyfile` to the domain and publish 80/443, and Caddy gets and renews Let's Encrypt certificates automatically. The API's port is never published to the host.

```yaml
# production additions (indicative)
services:
  web:
    ports: ["80:80", "443:443"]   # instead of 3000:80; Caddyfile site address = the domain
    volumes:
      - caddy_data:/data          # certificates
volumes:
  caddy_data:
```

**Server setup (once):**
- Docker + Compose plugin, a non-root deploy user with SSH key login only (password login disabled).
- Firewall allows only 22, 80, and 443.
- A DNS `A` record pointing the domain at the VPS.
- `.env` lives on the server only, readable by the deploy user (`chmod 600`).

**Deploying:** `bun run check` passes locally, then SSH in, `git pull`, `docker compose up -d --build`. The schema migrates on startup. A deploy is a few seconds of downtime, which is acceptable for an internal tool with one user.

**Backups:** the VPS has no managed snapshots, so the database is backed up by a daily cron job that runs `docker compose exec api bun run backup`. That script runs SQLite's `VACUUM INTO '/app/data/backups/<date>.db'`, which makes a consistent copy while the app is running (copying the file directly can catch it mid-write). The cron job then copies the backup off the server. Restoring is replacing the file and restarting. Test a restore once.

**Logs:** `docker compose logs`, with Docker's log rotation (`max-size`) so logs can't fill the disk. Errors also go to Sentry (ADR-004).

## Testing

Infrastructure is mostly config, which is exempt from test-first. Verify instead:

- `docker compose up` on a clean checkout serves the login page and the seeded data.
- After each deploy: the domain loads over HTTPS and login works (the `Secure` cookie is set).
- A backup restores into a working app (checked once, then after any backup change).
- The server exits with a clear error when `JWT_SECRET`, `ADMIN_EMAIL`, or `ADMIN_PASSWORD` is missing (this one has a unit test on `config.ts`).

---
- [x] Reviewed
