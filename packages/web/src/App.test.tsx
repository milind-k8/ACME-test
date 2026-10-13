import { expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import { App } from "./App";

it("shows the app title", () => {
  render(<App />);
  expect(screen.getByRole("heading", { name: "ACME Salary Management" })).toBeDefined();
});
