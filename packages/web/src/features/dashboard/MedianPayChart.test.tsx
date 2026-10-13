import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { MedianPayChart } from "./MedianPayChart";

describe("MedianPayChart", () => {
  it("is a titled figure with a text alternative listing each country's median", () => {
    render(
      <MedianPayChart
        rows={[
          { label: "United States", medianUsdCents: 14_500_000 },
          { label: "India", medianUsdCents: 4_500_000 },
        ]}
      />,
    );

    const figure = screen.getByRole("figure", { name: "Median pay by country" });
    expect(figure.textContent).toContain("United States: $145,000");
    expect(figure.textContent).toContain("India: $45,000");
  });
});
