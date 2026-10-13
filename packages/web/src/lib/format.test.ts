import { describe, expect, it } from "bun:test";
import { formatCountry, formatMajor, formatMoney } from "./format";

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

describe("formatMajor", () => {
  it.each([
    [8_500_050, "USD", "85000.50"],
    [8_500_000, "USD", "85000.00"],
    [85_000, "JPY", "85000"],
    [5, "USD", "0.05"],
  ])("shows %p minor units of %s as %p, ready to edit", (minor, currency, expected) => {
    expect(formatMajor(minor, currency)).toBe(expected);
  });
});
