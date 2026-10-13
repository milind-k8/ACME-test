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

// Edit and Delete live in each row's "⋯" menu.
async function chooseRowAction(name: string, action: "Edit" | "Delete") {
  fireEvent.keyDown(await screen.findByRole("button", { name: `More actions for ${name}` }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitem", { name: action }));
}

describe("EmployeeTable", () => {
  it("asks to sort by a column when its header is clicked", () => {
    const onSort = mock();
    render(<EmployeeTable employees={[]} sort="name" order="asc" onSort={onSort} onEdit={noop} onDelete={noop} />);

    fireEvent.click(screen.getByRole("button", { name: /Hired/ }));

    expect(onSort).toHaveBeenCalledWith("hiredAt");
  });

  it("marks the sorted column and its direction for assistive tech", () => {
    render(
      <EmployeeTable
        employees={[]}
        sort="salary"
        order="desc"
        onSort={() => undefined}
        onEdit={noop}
        onDelete={noop}
      />,
    );

    const salary = screen.getByRole("columnheader", { name: /Salary/ });
    expect(salary.getAttribute("aria-sort")).toBe("descending");
    expect(screen.getByRole("columnheader", { name: /Name/ }).getAttribute("aria-sort")).toBe("none");
  });

  it("says the salary column sorts in USD", () => {
    render(
      <EmployeeTable employees={[]} sort="name" order="asc" onSort={() => undefined} onEdit={noop} onDelete={noop} />,
    );

    expect(screen.getByRole("button", { name: /Salary/ }).textContent).toContain("Salary · sorted in USD");
  });

  it("offers Edit in each row's actions menu", async () => {
    const onEdit = mock();
    render(<EmployeeTable employees={[priya]} sort="name" order="asc" onSort={noop} onEdit={onEdit} onDelete={noop} />);

    await chooseRowAction("Priya Sharma", "Edit");

    expect(onEdit).toHaveBeenCalledWith(priya);
  });

  it("offers Delete in each row's actions menu", async () => {
    const onDelete = mock();
    render(
      <EmployeeTable employees={[priya]} sort="name" order="asc" onSort={noop} onEdit={noop} onDelete={onDelete} />,
    );

    await chooseRowAction("Priya Sharma", "Delete");

    expect(onDelete).toHaveBeenCalledWith(priya);
  });
});
