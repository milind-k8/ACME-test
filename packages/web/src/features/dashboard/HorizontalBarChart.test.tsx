import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { formatUsd } from "@/lib/format";
import { HorizontalBarChart } from "./HorizontalBarChart";

describe("HorizontalBarChart", () => {
  it("is a titled figure with a text alternative listing each bar's value", () => {
    render(
      <HorizontalBarChart
        title="Median pay by country"
        rows={[
          { label: "United States", value: 14_500_000 },
          { label: "India", value: 4_500_000 },
        ]}
        formatValue={formatUsd}
        formatTick={String}
      />,
    );

    const figure = screen.getByRole("figure", { name: "Median pay by country" });
    expect(figure.textContent).toContain("United States: $145,000");
    expect(figure.textContent).toContain("India: $45,000");
  });
});
