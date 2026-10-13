import tailwind from "bun-plugin-tailwind";

// The `bun build` CLI ignores bunfig's [serve.static] plugins, so Tailwind needs the JS API.
const result = await Bun.build({
  entrypoints: ["src/index.html"],
  outdir: "dist",
  minify: true,
  plugins: [tailwind],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
