import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { ColumnChart } from "./ColumnChart";

describe("ColumnChart", () => {
  it("is a titled figure with a text alternative listing each column, plus its reference marks", () => {
    render(
      <ColumnChart
        title="Salary distribution"
        rows={[
          { label: "$0–25K", value: 120 },
          { label: "$25–50K", value: 3_400 },
        ]}
        formatValue={(n) => `${String(n)} people`}
        markers={[{ at: "$25–50K", label: "Median $45,000" }]}
      />,
    );

    const figure = screen.getByRole("figure", { name: "Salary distribution" });
    expect(figure.textContent).toContain("$0–25K: 120 people");
    expect(figure.textContent).toContain("$25–50K: 3400 people");
    expect(figure.textContent).toContain("Median $45,000");
  });
});
