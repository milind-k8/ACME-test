import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// One series, so one hue (the brand blue, validated for light and dark surfaces) and no legend: the title names it.
const config = { value: { color: "var(--primary)" } } satisfies ChartConfig;
const ROW_PX = 36;

interface HorizontalBarChartProps {
  title: string;
  rows: { label: string; value: number }[];
  /** Tooltip and the text alternative, e.g. $97,000. */
  formatValue: (value: number) => string;
  /** Axis ticks, e.g. $100K. */
  formatTick: (value: number) => string;
}

export function HorizontalBarChart({ title, rows, formatValue, formatTick }: HorizontalBarChartProps) {
  return (
    <figure aria-label={title} className="rounded-lg border bg-background p-4 shadow-xs">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      {/* The text alternative: the same numbers for screen readers. */}
      <ul className="sr-only">
        {rows.map((row) => (
          <li key={row.label}>{`${row.label}: ${formatValue(row.value)}`}</li>
        ))}
      </ul>
      <ChartContainer config={config} className="mt-3 aspect-auto w-full" style={{ height: rows.length * ROW_PX + 32 }}>
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }} accessibilityLayer>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={formatTick} />
          <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={120} />
          <ChartTooltip
            cursor={false}
            content={({ active, payload, label }) => (
              <ChartTooltipContent active={active} payload={payload} label={label} formatValue={formatValue} />
            )}
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} maxBarSize={24} />
        </BarChart>
      </ChartContainer>
    </figure>
  );
}
