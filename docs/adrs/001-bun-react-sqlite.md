# ADR-001: Bun + SQLite + React (shadcn/ui)

**Status:** Accepted · 2026-10-13

## Context
I need a full-stack TypeScript app for one HR user and about 10k employees. It has to be deployable, demo-able, and quick for a reviewer to set up. The role is Node/React/TS, and the brief suggests a relational DB such as SQLite. My own rule for this project: don't add a library for something the platform already does or that we can build easily and safely.

## Decision
- **Runtime: Bun 1.4.** Use its built-ins in place of libraries:
  - `Bun.serve()` with `routes` for HTTP, instead of Express
  - `bun:sqlite` for the database, instead of better-sqlite3 or node:sqlite
  - `Bun.password` (argon2id) for password hashing
  - Bun's bundler with HTML imports and hot reload for the React app, instead of Vite
  - `bun test` as the test runner, instead of Vitest
- **Frontend:** a React SPA with shadcn/ui (Radix + Tailwind), started from Bun's own `bun init --react=shadcn` template.
- **Data access:** hand-written SQL in repository modules.

Before deciding, I checked in a scratch project that each built-in does what we need: 10k SQLite inserts in a transaction, password hash and verify, route params plus cookie parsing in `Bun.serve`, `bun test`, and a production build of the React + shadcn template.

## Alternatives considered
- **Node 24 + Express + Vite + Vitest.** This was my first plan, and it's the most familiar stack. It needs four or more extra packages for things Bun ships built in, and Node's `node:sqlite` still prints an experimental warning.
- **NestJS.** Good structure for large teams, but modules, DI, and decorators are ceremony for an app with about 12 endpoints.
- **Next.js (full stack).** One framework, but SSR adds nothing behind a login, and mixing server and client code makes the API boundary less clear to test.
- **Postgres.** Better for many writers or large data, but it needs a running server locally, in tests, and in deployment. That's overkill for one writer and 10k rows.
- **Mantine or MUI.** They do more out of the box, but the components live in `node_modules` behind a theme API. With shadcn the component code sits in the repo, where I can read it and change it.
- **An ORM (Prisma or Drizzle).** It adds a generation step and an abstraction over roughly 15 queries. Plain SQL is easier to review.

## Consequences
- The runtime dependencies are `jose`, `react`, and shadcn's peer packages. Setup is `bun install`, with no database server.
- Bun is younger than Node, and some npm packages assume Node internals. Everything we use is either built into Bun or plain JS, and the Bun version is pinned (`packageManager`, Docker `oven/bun:1.4`).
- `Bun.serve` routes have no middleware chain, so cross-cutting concerns are plain wrapper functions (`withAuth(handler)`). That's more explicit, with less magic.
- The reviewer needs Bun installed, or can just use `docker compose up`.
- Moving to Node later would touch the server entry point, the DB connection, and password hashing. The SQL and the domain code are runtime-agnostic.
