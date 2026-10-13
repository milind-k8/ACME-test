import { describe, expect, it } from "bun:test";
import { render, screen, within } from "@testing-library/react";
import { PayTable } from "./PayTable";

const india = {
  local: null,
  country: "IN",
  headcount: 1_260,
  payrollUsdCents: 6_048_000_000,
  minUsdCents: 1_200_000,
  medianUsdCents: 4_500_050,
  avgUsdCents: 4_800_000,
  maxUsdCents: 15_000_000,
};

describe("PayTable", () => {
  it("shows a group's figures in whole dollars, with the group's display name", () => {
    render(
      <PayTable
        caption="Pay per country"
        groupLabel="Country"
        rows={[india]}
        groupOf={(r) => r.country}
        format={() => "India"}
      />,
    );

    const table = screen.getByRole("table", { name: "Pay per country" });
    const row = within(table).getByRole("row", { name: /India/ });
    const cells = within(row)
      .getAllByRole("cell")
      .map((cell) => cell.textContent);
    expect(cells).toEqual(["India", "1,260", "$60,480,000", "$12,000", "$45,001", "$48,000", "$150,000"]);
  });

  it("labels each column", () => {
    render(<PayTable caption="Pay per country" groupLabel="Country" rows={[india]} groupOf={(r) => r.country} />);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Country",
      "Headcount",
      "Payroll",
      "Lowest",
      "Median",
      "Average",
      "Highest",
    ]);
  });

  it("shows each amount in the group's own currency under the USD figure, when there is one", () => {
    const local = {
      currency: "INR",
      payrollMinor: 504_000_000_000,
      minMinor: 100_000_000,
      medianMinor: 375_000_000,
      avgMinor: 400_000_000,
      maxMinor: 1_250_000_000,
    };
    render(
      <PayTable
        caption="Pay per country"
        groupLabel="Country"
        rows={[{ ...india, local }]}
        groupOf={(r) => r.country}
      />,
    );

    const median = within(screen.getByRole("row", { name: /IN/ })).getAllByRole("cell")[4];
    expect(median?.textContent).toBe("$45,001₹3,750,000.00");
  });

  it("shows only USD for a group paid in several currencies", () => {
    render(<PayTable caption="Pay per country" groupLabel="Country" rows={[india]} groupOf={(r) => r.country} />);

    const median = within(screen.getByRole("row", { name: /IN/ })).getAllByRole("cell")[4];
    expect(median?.textContent).toBe("$45,001");
  });

  it("doesn't repeat the amount for a group paid in USD", () => {
    const usd = { currency: "USD", payrollMinor: 1, minMinor: 1, medianMinor: 4_500_100, avgMinor: 1, maxMinor: 1 };
    render(
      <PayTable
        caption="Pay per country"
        groupLabel="Country"
        rows={[{ ...india, local: usd }]}
        groupOf={(r) => r.country}
      />,
    );

    const median = within(screen.getByRole("row", { name: /IN/ })).getAllByRole("cell")[4];
    expect(median?.textContent).toBe("$45,001");
  });
});
