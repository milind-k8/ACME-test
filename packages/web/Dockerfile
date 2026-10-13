# Build context is the repo root (workspaces share one lockfile).
FROM oven/bun:1.4.3-slim AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN bun install --frozen-lockfile --filter @smt/web
COPY packages/web packages/web
WORKDIR /app/packages/web
RUN bun run build

FROM caddy:2.11.7-alpine
COPY packages/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/packages/web/dist /srv
