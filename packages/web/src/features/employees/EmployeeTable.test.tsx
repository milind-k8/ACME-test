import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import { EmployeeTable } from "./EmployeeTable";

describe("EmployeeTable", () => {
  it("asks to sort by a column when its header is clicked", () => {
    const onSort = mock();
    render(<EmployeeTable employees={[]} sort="name" order="asc" onSort={onSort} />);

    fireEvent.click(screen.getByRole("button", { name: /Hired/ }));

    expect(onSort).toHaveBeenCalledWith("hiredAt");
  });

  it("marks the sorted column and its direction for assistive tech", () => {
    render(<EmployeeTable employees={[]} sort="salary" order="desc" onSort={() => undefined} />);

    const salary = screen.getByRole("columnheader", { name: /Salary/ });
    expect(salary.getAttribute("aria-sort")).toBe("descending");
    expect(screen.getByRole("columnheader", { name: /Name/ }).getAttribute("aria-sort")).toBe("none");
  });

  it("says the salary column sorts in USD", () => {
    render(<EmployeeTable employees={[]} sort="name" order="asc" onSort={() => undefined} />);

    expect(screen.getByRole("button", { name: /Salary/ }).textContent).toContain("Salary · sorted in USD");
  });
});
