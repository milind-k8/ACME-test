/** One headline figure. Rendered inside the page's <dl>, so label and value stay associated for screen readers. */
export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-xs">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}
