import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Employee } from "@smt/shared/api-types";
import { EmployeeTable } from "./EmployeeTable";

const priya: Employee = {
  id: 1,
  employeeNumber: "E00001",
  firstName: "Priya",
  lastName: "Sharma",
  jobTitle: "Software Engineer",
  department: "Engineering",
  country: "IN",
  salaryMinor: 300_000_000,
  currency: "INR",
  hiredAt: "2020-01-15",
};
const noop = () => undefined;

describe("EmployeeTable", () => {
  it("asks to sort by a column when its header is clicked", () => {
    const onSort = mock();
    render(<EmployeeTable employees={[]} sort="name" order="asc" onSort={onSort} onEdit={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Hired/ }));

    expect(onSort).toHaveBeenCalledWith("hiredAt");
  });

  it("marks the sorted column and its direction for assistive tech", () => {
    render(<EmployeeTable employees={[]} sort="salary" order="desc" onSort={() => undefined} onEdit={noop} />);

    const salary = screen.getByRole("columnheader", { name: /Salary/ });
    expect(salary.getAttribute("aria-sort")).toBe("descending");
    expect(screen.getByRole("columnheader", { name: /Name/ }).getAttribute("aria-sort")).toBe("none");
  });

  it("says the salary column sorts in USD", () => {
    render(<EmployeeTable employees={[]} sort="name" order="asc" onSort={() => undefined} onEdit={noop} />);

    expect(screen.getByRole("button", { name: /Salary/ }).textContent).toContain("Salary · sorted in USD");
  });

  it("offers an Edit action on each row, named for the employee", () => {
    const onEdit = mock();
    render(<EmployeeTable employees={[priya]} sort="name" order="asc" onSort={noop} onEdit={onEdit} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit Priya Sharma" }));

    expect(onEdit).toHaveBeenCalledWith(priya);
  });
});
