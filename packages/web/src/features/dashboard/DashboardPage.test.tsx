import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Dashboard, EmployeeFilterOptions } from "@smt/shared/api-types";
import { ApiError } from "@/lib/api";

const dashboard: Dashboard = {
  fxAsOf: "2026-10-01",
  summary: {
    headcount: 10_000,
    payrollUsdCents: 845_124_900_00,
    minUsdCents: 2_000_000,
    medianUsdCents: 7_850_000,
    avgUsdCents: 8_451_249,
    maxUsdCents: 25_000_000,
    hiresLast12Months: 612,
    avgTenureYears: 8.3,
  },
  byCountry: [
    {
      country: "IN",
      headcount: 1_260,
      payrollUsdCents: 6_048_000_000,
      minUsdCents: 1_200_000,
      medianUsdCents: 4_500_000,
      avgUsdCents: 4_800_000,
      maxUsdCents: 15_000_000,
    },
  ],
  byDepartment: [
    {
      department: "Engineering",
      headcount: 3_120,
      payrollUsdCents: 30_000_000_000,
      minUsdCents: 2_000_000,
      medianUsdCents: 9_000_000,
      avgUsdCents: 9_615_385,
      maxUsdCents: 25_000_000,
    },
  ],
  byJobTitle: [
    {
      jobTitle: "Engineering Manager",
      headcount: 480,
      payrollUsdCents: 7_200_000_000,
      minUsdCents: 6_000_000,
      medianUsdCents: 15_000_000,
      avgUsdCents: 15_000_000,
      maxUsdCents: 25_000_000,
    },
  ],
  salaryBands: [
    { fromUsdCents: 0, toUsdCents: 2_500_000, headcount: 900 },
    { fromUsdCents: 2_500_000, toUsdCents: 5_000_000, headcount: 2_400 },
    { fromUsdCents: 5_000_000, toUsdCents: 7_500_000, headcount: 3_000 },
    { fromUsdCents: 7_500_000, toUsdCents: 10_000_000, headcount: 2_000 },
    { fromUsdCents: 10_000_000, toUsdCents: 12_500_000, headcount: 900 },
    { fromUsdCents: 12_500_000, toUsdCents: 15_000_000, headcount: 450 },
    { fromUsdCents: 15_000_000, toUsdCents: 17_500_000, headcount: 200 },
    { fromUsdCents: 17_500_000, toUsdCents: 20_000_000, headcount: 100 },
    { fromUsdCents: 20_000_000, toUsdCents: null, headcount: 50 },
  ],
  hiresByMonth: [
    { month: "2025-11", hires: 40 },
    { month: "2025-12", hires: 35 },
    { month: "2026-01", hires: 60 },
    { month: "2026-02", hires: 52 },
    { month: "2026-03", hires: 48 },
    { month: "2026-04", hires: 51 },
    { month: "2026-05", hires: 47 },
    { month: "2026-06", hires: 55 },
    { month: "2026-07", hires: 44 },
    { month: "2026-08", hires: 43 },
    { month: "2026-09", hires: 50 },
    { month: "2026-10", hires: 37 },
  ],
};

const getDashboard = mock<(params: URLSearchParams) => Promise<Dashboard>>(() => Promise.resolve(dashboard));
const getFilterOptions = mock<() => Promise<EmployeeFilterOptions>>(() =>
  Promise.resolve({ countries: ["IN", "US"], departments: ["Engineering"], jobTitles: ["Data Analyst"] }),
);
void mock.module("./dashboard.api", () => ({ getDashboard, getFilterOptions }));
const { DashboardPage } = await import("./DashboardPage");

// Each figure is a <dt> label followed by its <dd> value.
const figure = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent;

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  getDashboard.mockClear();
  getDashboard.mockImplementation(() => Promise.resolve(dashboard));
});

describe("DashboardPage", () => {
  it("shows the six headline figures, money in whole dollars", async () => {
    render(<DashboardPage />);

    await screen.findByText("Headcount", { selector: "dt" });
    expect(figure("Headcount")).toBe("10,000");
    expect(figure("Total annual payroll")).toBe("$845,124,900");
    expect(figure("Median salary")).toBe("$78,500");
    expect(figure("Average salary")).toBe("$84,512");
    expect(figure("Hires in the last 12 months")).toBe("612");
    expect(figure("Average tenure")).toBe("8.3 years");
  });

  it("says the figures are in USD and when the rates are from", async () => {
    render(<DashboardPage />);

    expect(await screen.findByText("In USD, rates as of 2026-10-01")).toBeTruthy();
  });

  it("shows a loading placeholder until the figures arrive", () => {
    getDashboard.mockImplementationOnce(() => new Promise(() => undefined));
    render(<DashboardPage />);

    expect(screen.getByRole("status", { name: "Loading dashboard" })).toBeTruthy();
  });

  it("shows the error and loads again on Retry", async () => {
    getDashboard.mockImplementationOnce(() => Promise.reject(new ApiError(500, "internal", "Something went wrong")));
    render(<DashboardPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    await screen.findByText("Headcount", { selector: "dt" });
    expect(getDashboard).toHaveBeenCalledTimes(2);
  });

  it("shows pay per country as a chart and a table, countries by name", async () => {
    render(<DashboardPage />);

    expect((await screen.findByRole("figure", { name: "Median pay by country" })).textContent).toContain(
      "India: $45,000",
    );
    expect(screen.getByRole("table", { name: "Pay per country" }).textContent).toContain("India");
  });

  it("shows headcount per department as a chart and pay per department as a table", async () => {
    render(<DashboardPage />);

    expect((await screen.findByRole("figure", { name: "Headcount by department" })).textContent).toContain(
      "Engineering: 3,120",
    );
    expect(screen.getByRole("table", { name: "Pay per department" }).textContent).toContain("Engineering");
  });

  it("shows pay per job title as a table", async () => {
    render(<DashboardPage />);

    expect((await screen.findByRole("table", { name: "Pay per job title" })).textContent).toContain(
      "Engineering Manager",
    );
  });

  it("shows the salary distribution in $25K bands with the median and average marked", async () => {
    render(<DashboardPage />);

    const figure = await screen.findByRole("figure", { name: "Salary distribution" });
    expect(figure.textContent).toContain("$50–75K: 3,000");
    expect(figure.textContent).toContain("$200K+: 50");
    expect(figure.textContent).toContain("Median $78,500");
    expect(figure.textContent).toContain("Average $84,512");
  });

  it("shows hires per month for the last 12 months", async () => {
    render(<DashboardPage />);

    const figure = await screen.findByRole("figure", { name: "Hires per month" });
    expect(figure.textContent).toContain("Nov 2025: 40");
    expect(figure.textContent).toContain("Oct 2026: 37");
  });

  it("narrows everything to the chosen job title and keeps it in the URL", async () => {
    render(<DashboardPage />);

    fireEvent.keyDown(await screen.findByRole("combobox", { name: "Job title" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "Data Analyst" }));

    await waitFor(() => {
      expect(window.location.search).toBe("?jobTitle=Data+Analyst");
    });
    expect(getDashboard.mock.calls.at(-1)?.[0].get("jobTitle")).toBe("Data Analyst");
  });

  it("applies filters from the URL on load", async () => {
    window.history.replaceState(null, "", "/?country=IN");

    render(<DashboardPage />);

    await screen.findByText("Headcount", { selector: "dt" });
    expect(getDashboard.mock.calls[0]?.[0].get("country")).toBe("IN");
    expect(screen.getByRole("combobox", { name: "Country" }).textContent).toBe("India");
  });

  it("says when nothing matches and clears the filters on request", async () => {
    window.history.replaceState(null, "", "/?country=US&jobTitle=Data+Analyst");
    getDashboard.mockImplementationOnce(() =>
      Promise.resolve({ ...dashboard, summary: { ...dashboard.summary, headcount: 0 }, byCountry: [] }),
    );
    render(<DashboardPage />);

    expect(await screen.findByText("No employees match these filters.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() => {
      expect(window.location.search).toBe("");
    });
  });
});
