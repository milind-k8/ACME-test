import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// One series, one hue (validated for light and dark surfaces); no legend, the title names it.
const config = { value: { color: "var(--primary)" } } satisfies ChartConfig;

interface ColumnChartProps {
  title: string;
  /** `tick` is a shorter axis label, e.g. "$25K" for "$25–50K" or "Nov" for "Nov 2025". */
  rows: { label: string; value: number; tick?: string }[];
  formatValue: (value: number) => string;
  /** Vertical marks at a column, e.g. where the median falls. Named in text too, never by the line alone. */
  markers?: { at: string; label: string }[];
}

export function ColumnChart({ title, rows, formatValue, markers = [] }: ColumnChartProps) {
  const tickOf = new Map(rows.map((r) => [r.label, r.tick ?? r.label]));
  // Markers on the same column share one line, labelled "Median & Average", so their labels never overlap.
  const lines = [...Map.groupBy(markers, (m) => m.at)].map(([at, group]) => ({
    at,
    label: group.map((m) => m.label.split(" ")[0]).join(" & "),
  }));
  return (
    <figure aria-label={title} className="relative rounded-lg border bg-background p-4 shadow-xs">
      <figcaption className="text-sm font-medium">{title}</figcaption>
      {markers.length > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">{markers.map((m) => m.label).join(" · ")}</p>
      )}
      {/* The text alternative: the same numbers for screen readers. */}
      <ul className="sr-only">
        {rows.map((row) => (
          <li key={row.label}>{`${row.label}: ${formatValue(row.value)}`}</li>
        ))}
      </ul>
      <ChartContainer config={config} className="mt-3 aspect-auto h-64 w-full">
        <BarChart data={rows} margin={{ top: 16, left: 0, right: 8 }} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickFormatter={(label: string) => tickOf.get(label) ?? label}
            interval={0}
          />
          <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={formatValue} />
          <ChartTooltip
            cursor={false}
            content={({ active, payload, label }) => (
              <ChartTooltipContent active={active} payload={payload} label={label} formatValue={formatValue} />
            )}
          />
          <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          {lines.map((line) => (
            <ReferenceLine
              key={line.at}
              x={line.at}
              stroke="var(--muted-foreground)"
              label={{ value: line.label, position: "top", fill: "var(--muted-foreground)", fontSize: 11 }}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </figure>
  );
}
