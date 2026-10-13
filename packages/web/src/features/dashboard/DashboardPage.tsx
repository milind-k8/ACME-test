import { useEffect, useState } from "react";
import { EMPLOYEE_FILTERS, type Dashboard, type EmployeeFilterOptions, type SalaryBand } from "@smt/shared/api-types";
import { FilterBar } from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { formatCountry, formatUsd } from "@/lib/format";

const compactUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" });
const formatUsdCompact = (cents: number) => compactUsd.format(cents / 100);
import { useQueryParams } from "@/lib/router";
import { getDashboard, getFilterOptions } from "./dashboard.api";
import { CHART_COPY, DASHBOARD_COPY } from "./dashboard.constants";
import { ColumnChart } from "./ColumnChart";
import { HorizontalBarChart } from "./HorizontalBarChart";
import { PayTable } from "./PayTable";
import { StatTile } from "./StatTile";

const count = new Intl.NumberFormat("en-US");
const thousands = (cents: number) => String(cents / 100_000);
const monthName = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

/** "$25–50K", or "$200K+" for the open-ended top band. */
const bandLabel = (band: SalaryBand) =>
  band.toUsdCents === null
    ? `$${thousands(band.fromUsdCents)}K+`
    : `$${thousands(band.fromUsdCents)}–${thousands(band.toUsdCents)}K`;

/** The band's lower edge for the axis: "$0", "$25K", …, "$200K+". */
const bandTick = (band: SalaryBand) =>
  band.fromUsdCents === 0 ? "$0" : `$${thousands(band.fromUsdCents)}K${band.toUsdCents === null ? "+" : ""}`;

/** A marker at the band a salary falls in; none when there are no bands (e.g. no matching employees). */
const markerAt = (bands: SalaryBand[], cents: number, label: string) => {
  const band = bands.find((b) => b.toUsdCents === null || cents < b.toUsdCents);
  return band ? [{ at: bandLabel(band), label }] : [];
};

/** "2025-11" → "Nov 2025". */
const monthLabel = (month: string) => monthName.format(new Date(`${month}-01T00:00:00Z`));

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: Dashboard };

export function DashboardPage() {
  const [params, setParams] = useQueryParams();
  const [options, setOptions] = useState<EmployeeFilterOptions | null>(null);
  const query = params.toString();
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    // Only the latest request may update the page.
    let current = true;
    setState({ status: "loading" });
    getDashboard(new URLSearchParams(query)).then(
      (data) => {
        if (current) setState({ status: "ready", data });
      },
      (err: unknown) => {
        if (!current) return;
        // Anything that isn't an ApiError is a bug: rethrow inside React so the error boundary reports it.
        if (!(err instanceof ApiError)) {
          setState(() => {
            throw err;
          });
          return;
        }
        setState({ status: "error", message: err.message });
      },
    );
    return () => {
      current = false;
    };
  }, [query, reloads]);

  useEffect(() => {
    getFilterOptions().then(setOptions, (err: unknown) => {
      // Without options the filter bar just stays hidden; the figures still load. Bugs still reach the boundary.
      if (!(err instanceof ApiError)) {
        setOptions(() => {
          throw err;
        });
      }
    });
  }, []);

  const filters = Object.fromEntries(EMPLOYEE_FILTERS.map((name) => [name, params.get(name) ?? undefined]));
  const clearFilters = () => {
    setParams(Object.fromEntries(EMPLOYEE_FILTERS.map((name) => [name, undefined])));
  };
  const hasData = state.status === "ready" && state.data.summary.headcount > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{DASHBOARD_COPY.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {state.status === "ready" ? DASHBOARD_COPY.fxNote(state.data.fxAsOf) : DASHBOARD_COPY.subtitle}
        </p>
      </div>
      {options && (
        <FilterBar
          options={options}
          value={filters}
          onChange={(name, value) => {
            setParams({ [name]: value });
          }}
        />
      )}
      {state.status === "loading" && (
        <div role="status" aria-label={DASHBOARD_COPY.loading} className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}
      {state.status === "error" && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{state.message}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReloads((n) => n + 1);
            }}
          >
            {DASHBOARD_COPY.retry}
          </Button>
        </div>
      )}
      {state.status === "ready" && !hasData && (
        <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
          <span>{DASHBOARD_COPY.noMatches}</span>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            {DASHBOARD_COPY.clearFilters}
          </Button>
        </div>
      )}
      {hasData && (
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatTile label={DASHBOARD_COPY.headcount} value={count.format(state.data.summary.headcount)} />
          <StatTile label={DASHBOARD_COPY.payroll} value={formatUsd(state.data.summary.payrollUsdCents)} />
          <StatTile label={DASHBOARD_COPY.median} value={formatUsd(state.data.summary.medianUsdCents)} />
          <StatTile label={DASHBOARD_COPY.average} value={formatUsd(state.data.summary.avgUsdCents)} />
          <StatTile label={DASHBOARD_COPY.hires} value={count.format(state.data.summary.hiresLast12Months)} />
          <StatTile label={DASHBOARD_COPY.tenure} value={DASHBOARD_COPY.years(state.data.summary.avgTenureYears)} />
        </dl>
      )}
      {hasData && (
        <>
          <section className="grid gap-4 xl:grid-cols-2">
            <ColumnChart
              title={CHART_COPY.salaryDistribution}
              rows={state.data.salaryBands.map((b) => ({ label: bandLabel(b), value: b.headcount, tick: bandTick(b) }))}
              formatValue={(n) => count.format(n)}
              markers={[
                ...markerAt(
                  state.data.salaryBands,
                  state.data.summary.medianUsdCents,
                  CHART_COPY.medianMarker(formatUsd(state.data.summary.medianUsdCents)),
                ),
                ...markerAt(
                  state.data.salaryBands,
                  state.data.summary.avgUsdCents,
                  CHART_COPY.averageMarker(formatUsd(state.data.summary.avgUsdCents)),
                ),
              ]}
            />
            <ColumnChart
              title={CHART_COPY.hiresPerMonth}
              rows={state.data.hiresByMonth.map((m) => ({
                label: monthLabel(m.month),
                value: m.hires,
                tick: monthLabel(m.month).slice(0, 3),
              }))}
              formatValue={(n) => count.format(n)}
            />
          </section>
          <section className="flex flex-col gap-4">
            {/* Bars read best sorted by their own value; the table keeps the API's largest-headcount order. */}
            <HorizontalBarChart
              title={CHART_COPY.medianByCountry}
              rows={state.data.byCountry
                .map((c) => ({ label: formatCountry(c.country), value: c.medianUsdCents }))
                .sort((a, b) => b.value - a.value)}
              formatValue={formatUsd}
              formatTick={formatUsdCompact}
            />
            <PayTable
              caption={CHART_COPY.payByCountry}
              groupLabel={CHART_COPY.country}
              rows={state.data.byCountry}
              groupOf={(c) => c.country}
              format={formatCountry}
            />
            <HorizontalBarChart
              title={CHART_COPY.headcountByDepartment}
              rows={state.data.byDepartment.map((d) => ({ label: d.department, value: d.headcount }))}
              formatValue={(n) => count.format(n)}
              formatTick={(n) => count.format(n)}
            />
            <PayTable
              caption={CHART_COPY.payByDepartment}
              groupLabel={CHART_COPY.department}
              rows={state.data.byDepartment}
              groupOf={(d) => d.department}
            />
            <PayTable
              caption={CHART_COPY.payByJobTitle}
              groupLabel={CHART_COPY.jobTitle}
              rows={state.data.byJobTitle}
              groupOf={(j) => j.jobTitle}
            />
          </section>
        </>
      )}
    </div>
  );
}
