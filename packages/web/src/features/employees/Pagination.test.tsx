import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { Pagination } from "./Pagination";

const button = (name: string) => screen.getByRole<HTMLButtonElement>("button", { name });

describe("Pagination", () => {
  it("shows which rows are on screen out of the total", () => {
    render(<Pagination page={2} pageSize={50} total={10_000} onPageChange={() => undefined} />);

    expect(screen.getByText("Showing 51–100 of 10,000")).toBeTruthy();
  });

  it("disables Previous on the first page", () => {
    render(<Pagination page={1} pageSize={50} total={120} onPageChange={() => undefined} />);

    expect(button("Previous").disabled).toBe(true);
    expect(button("Next").disabled).toBe(false);
  });

  it("disables Next on the last page and shows the partial range", () => {
    render(<Pagination page={3} pageSize={50} total={120} onPageChange={() => undefined} />);

    expect(button("Next").disabled).toBe(true);
    expect(screen.getByText("Showing 101–120 of 120")).toBeTruthy();
  });

  it("asks for the neighbouring page", () => {
    const onPageChange = mock();
    render(<Pagination page={2} pageSize={50} total={120} onPageChange={onPageChange} />);

    fireEvent.click(button("Next"));
    fireEvent.click(button("Previous"));

    expect(onPageChange.mock.calls).toEqual([[3], [1]]);
  });
});
