import { describe, expect, it } from "bun:test";
import { render, screen, within } from "@testing-library/react";
import { PayTable } from "./PayTable";

const india = {
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
});
