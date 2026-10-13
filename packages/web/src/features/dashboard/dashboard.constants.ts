// Page copy for the dashboard.
export const DASHBOARD_COPY = {
  title: "Dashboard",
  subtitle: "Pay and headcount at a glance.",
  loading: "Loading dashboard",
  retry: "Retry",
  fxNote: (asOf: string) => `In USD, rates as of ${asOf}`,
  headcount: "Headcount",
  payroll: "Total annual payroll",
  median: "Median salary",
  average: "Average salary",
  hires: "Hires in the last 12 months",
  tenure: "Average tenure",
  years: (n: number) => `${n.toFixed(1)} years`,
} as const;
