import index from "./src/index.html";

// Dev only: same origin as production (where Caddy proxies /api), so the auth cookie behaves the same.
const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:3000";

const server = Bun.serve({
  port: Number(process.env.WEB_PORT ?? 5173),
  development: true,
  routes: {
    "/api/*": (req) => {
      const { pathname, search } = new URL(req.url);
      return fetch(new Request(apiOrigin + pathname + search, req));
    },
    "/*": index,
  },
});

console.log(`Web dev server on ${server.url.href} (API → ${apiOrigin})`);
