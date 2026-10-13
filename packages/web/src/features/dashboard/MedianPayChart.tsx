import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatUsd } from "@/lib/format";
import { CHART_COPY } from "./dashboard.constants";

// One series, so one hue (the brand blue, validated for light and dark surfaces) and no legend: the title names it.
const config = { medianUsdCents: { label: CHART_COPY.median, color: "var(--primary)" } } satisfies ChartConfig;
const compactUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" });
const ROW_PX = 36;

export function MedianPayChart({ rows }: { rows: { label: string; medianUsdCents: number }[] }) {
  return (
    <figure aria-label={CHART_COPY.medianByCountry} className="rounded-lg border bg-background p-4 shadow-xs">
      <figcaption className="text-sm font-medium">{CHART_COPY.medianByCountry}</figcaption>
      {/* The text alternative: the same numbers for screen readers. */}
      <ul className="sr-only">
        {rows.map((row) => (
          <li key={row.label}>{`${row.label}: ${formatUsd(row.medianUsdCents)}`}</li>
        ))}
      </ul>
      <ChartContainer config={config} className="mt-3 aspect-auto w-full" style={{ height: rows.length * ROW_PX + 32 }}>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }} accessibilityLayer>
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickFormatter={(cents: number) => compactUsd.format(cents / 100)}
          />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={110} />
          <ChartTooltip
            cursor={false}
            content={({ active, payload, label }) => (
              <ChartTooltipContent active={active} payload={payload} label={label} formatValue={formatUsd} />
            )}
          />
          <Bar dataKey="medianUsdCents" fill="var(--color-medianUsdCents)" radius={[0, 4, 4, 0]} maxBarSize={24} />
        </BarChart>
      </ChartContainer>
    </figure>
  );
}
