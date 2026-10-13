import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Dashboard } from "@smt/shared/api-types";
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
};

const getDashboard = mock<(params: URLSearchParams) => Promise<Dashboard>>(() => Promise.resolve(dashboard));
void mock.module("./dashboard.api", () => ({ getDashboard }));
const { DashboardPage } = await import("./DashboardPage");

// Each figure is a <dt> label followed by its <dd> value.
const figure = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent;

beforeEach(() => {
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
});
