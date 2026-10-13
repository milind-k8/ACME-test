# DevOps

How the app is configured, built, run, and deployed. Read [development-process.md](development-process.md) first.

## Packaging

- **One `package.json`, no workspaces.** One Bun process serves the API and the frontend from one origin: one deployable, no CORS, and the `SameSite=Strict` cookie just works.
- Bun version is pinned (`packageManager` field, Docker `oven/bun:1.4`).
- Root files: `package.json`, `bunfig.toml`, `tsconfig.json`, `components.json` (shadcn), `eslint.config.js`, `Dockerfile`, `docker-compose.yml`.
- Dev tooling dependencies: `typescript`, `@types/bun`, `eslint`, `typescript-eslint` (needed for ESLint to read TypeScript and for the no-`any` rules), `prettier`.
- If web and server ever need separate deploys, split `server/`, `web/`, and `shared/` into Bun workspaces. The import rules already treat them as separate packages.

## Commands

| Command | What it does |
|---------|--------------|
| `bun install` | Install dependencies |
| `bun dev` | Start the server with hot reload (API + frontend) |
| `bun test` | Run all tests |
| `bun run seed` | Reset the database and seed 10,000 employees |
| `bun run backup` | Write a consistent copy of the database to `data/backups/` |
| `bun run lint` / `bun run typecheck` | ESLint / `tsc --noEmit` |
| `bun run build` and `bun start` | Production build and run |
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
- **Docker image:** the base image is pinned (`oven/bun:1.4`) and rebuilt on each deploy, so it picks up OS security patches.
- `bun.lock` is always committed, so every install gets the exact versions that were audited.

## Environment variables

| Variable | Notes |
|----------|-------|
| `JWT_SECRET` | Required; the server refuses to start in production without it |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seed the single HR account |
| `DATABASE_PATH` | SQLite file path (`/app/data/…` in containers) |
| `PORT` | Defaults to 3000 |
| `SENTRY_DSN` | Server error reporting. Set in production only; unset means Sentry is off |
| `BUN_PUBLIC_SENTRY_DSN` | Browser error reporting, inlined into the bundle at build time. Production only |

`.env` is never committed. `config.ts` reads and validates these once at startup.

## Docker Compose

```yaml
# docker-compose.yml (indicative)
services:
  app:
    build: .               # oven/bun:1.4 image, bun install --production, bun run build
    ports: ["3000:3000"]
    env_file: .env
    volumes:
      - data:/app/data     # SQLite file survives restarts
volumes:
  data:
```

- `docker compose up` builds and starts the app. On first boot it creates the schema and seeds 10,000 employees if the database is empty.
- One service and no database container, because SQLite is a file.

## Deployment

A single **VPS** running the same Docker Compose setup. Backend and frontend deploy together: the `app` container serves both the API and the built React app from one origin (see Packaging). Not a PaaS: SQLite is a file and needs a persistent disk, and a VPS gives that with no platform lock-in. Serverless hosts (e.g. Vercel) are ruled out because their filesystem is ephemeral.

**HTTPS** is required: the auth cookie is `Secure` (ADR-003) and won't be sent over plain HTTP. A **Caddy** container in the same Compose file sits in front of the app as a reverse proxy and gets and renews Let's Encrypt certificates automatically. The app's port is not published to the host; only Caddy's 80/443 are.

```yaml
# production additions (indicative)
services:
  app:
    restart: unless-stopped
    expose: ["3000"]            # internal only, no host port
  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile   # salary.example.com { reverse_proxy app:3000 }
      - caddy_data:/data                    # certificates
volumes:
  caddy_data:
```

**Server setup (once):**
- Docker + Compose plugin, a non-root deploy user with SSH key login only (password login disabled).
- Firewall allows only 22, 80, and 443.
- A DNS `A` record pointing the domain at the VPS.
- `.env` lives on the server only, readable by the deploy user (`chmod 600`).

**Deploying:** `bun run check` passes locally, then SSH in, `git pull`, `docker compose up -d --build`. The schema migrates on startup. A deploy is a few seconds of downtime, which is acceptable for an internal tool with one user.

**Backups:** the VPS has no managed snapshots, so the database is backed up by a daily cron job that runs `docker compose exec app bun run backup`. That script runs SQLite's `VACUUM INTO '/app/data/backups/<date>.db'`, which makes a consistent copy while the app is running (copying the file directly can catch it mid-write). The cron job then copies the backup off the server. Restoring is replacing the file and restarting. Test a restore once.

**Logs:** `docker compose logs`, with Docker's log rotation (`max-size`) so logs can't fill the disk. Errors also go to Sentry (ADR-004).

## Testing

Infrastructure is mostly config, which is exempt from test-first. Verify instead:

- `docker compose up` on a clean checkout serves the login page and the seeded data.
- After each deploy: the domain loads over HTTPS and login works (the `Secure` cookie is set).
- A backup restores into a working app (checked once, then after any backup change).
- The production server exits with a clear error when `JWT_SECRET` is missing (this one has a unit test on `config.ts`).

---
- [x] Reviewed
