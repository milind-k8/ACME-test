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

export const PAY_COLUMNS = {
  headcount: "Headcount",
  payroll: "Payroll",
  min: "Lowest",
  median: "Median",
  avg: "Average",
  max: "Highest",
} as const;

export const CHART_COPY = {
  median: "Median salary",
  medianByCountry: "Median pay by country",
  payByCountry: "Pay per country",
  country: "Country",
  headcountByDepartment: "Headcount by department",
  payByDepartment: "Pay per department",
  department: "Department",
  payByJobTitle: "Pay per job title",
  jobTitle: "Job title",
  salaryDistribution: "Salary distribution",
  hiresPerMonth: "Hires per month",
  medianMarker: (value: string) => `Median ${value}`,
  averageMarker: (value: string) => `Average ${value}`,
} as const;
