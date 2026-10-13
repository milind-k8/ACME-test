import { describe, expect, it } from "bun:test";
import { formatCountry, formatMoney } from "./format";

describe("formatMoney", () => {
  it.each([
    [6_500_000, "JPY", "¥6,500,000"],
    [15_000_000, "USD", "$150,000.00"],
    [5_400_000, "EUR", "€54,000.00"],
  ])("formats %p minor units of %s as %s", (minor, currency, expected) => {
    expect(formatMoney(minor, currency)).toBe(expected);
  });
});

describe("formatCountry", () => {
  it("shows an ISO country code as its English name", () => {
    expect(formatCountry("IN")).toBe("India");
  });
});
