# Build context is the repo root (workspaces share one lockfile).
FROM oven/bun:1.4.3-slim
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN bun install --frozen-lockfile --production --filter @smt/server
COPY packages/server packages/server
RUN mkdir -p /app/data && chown bun:bun /app/data
USER bun
ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "packages/server/src/index.ts"]
