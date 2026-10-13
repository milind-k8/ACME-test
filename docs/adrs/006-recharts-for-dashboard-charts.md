# ADR-006: Recharts for dashboard charts

**Status:** Accepted · 2026-10-13 · Supersedes frontend.md's "Charts: CSS bars, no chart library"

## Context
The dashboard (spec 05) needs four charts: median pay by country, headcount by department, a salary histogram, and hires per month. HR asked for charts and graphs, not only tables. frontend.md planned hand-made CSS bars and ruled out shadcn's `Chart` because it pulls in Recharts.

## Decision
- **Recharts** (`recharts` 3.10.1, plus its peer `react-is`), pinned exact, used through **shadcn's `Chart`** component (`components/ui/chart.tsx`), which themes it with our CSS variables and gives a consistent tooltip and legend.
- Charts live in `features/dashboard/` as small components that take ready-shaped data; the data shaping is in pure, unit-tested functions on the server (`summarize.ts`), so chart components hold no logic worth testing beyond "it renders its title".
- Every chart has a text alternative: the tables next to it, or a visually hidden summary.

## Alternatives considered
- **Hand-built SVG** (the recommended option at the time): no dependency and full control, but each chart type (axes, ticks, histogram, tooltip) is code we'd own and test. I preferred speed and built-in tooltips.
- **CSS bars only** (the original frontend.md rule): fine for one bar list, not for a histogram or a time series.
- **Chart.js / ECharts**: canvas-based, harder to theme with Tailwind variables and less accessible than SVG.

## Consequences
- The web bundle grows (Recharts and its dependencies, e.g. Redux Toolkit, d3 parts via victory-vendor). Acceptable for an internal tool behind a login.
- `bun audit` now covers more packages.
- happy-dom has no layout, so component tests can't assert on rendered chart geometry; chart behaviour is checked in a real browser during review.
