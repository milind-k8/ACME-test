import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Employee, Page } from "@smt/shared/api-types";
import { ApiError } from "@/lib/api";

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

const page = (items: Employee[]): Page<Employee> => ({ items, total: items.length, page: 1, pageSize: 50 });

const listEmployees = mock<() => Promise<Page<Employee>>>(() => Promise.resolve(page([priya])));
void mock.module("./employees.api", () => ({ listEmployees }));
const { EmployeesPage } = await import("./EmployeesPage");

beforeEach(() => {
  listEmployees.mockClear();
});

describe("EmployeesPage", () => {
  it("shows each employee as a table row", async () => {
    render(<EmployeesPage />);

    const row = await screen.findByRole("row", { name: /E00001/ });
    for (const text of [
      "E00001",
      "Priya Sharma",
      "Software Engineer",
      "Engineering",
      "India",
      "₹3,000,000.00",
      "2020-01-15",
    ]) {
      expect(within(row).getByText(text)).toBeTruthy();
    }
  });

  it("shows a loading placeholder until the employees arrive", async () => {
    let resolve: (value: Page<Employee>) => void = () => undefined;
    listEmployees.mockImplementationOnce(() => new Promise((r) => (resolve = r)));
    render(<EmployeesPage />);

    expect(screen.getByRole("status", { name: "Loading employees" })).toBeTruthy();

    resolve(page([priya]));
    await screen.findByRole("row", { name: /E00001/ });
    expect(screen.queryByRole("status", { name: "Loading employees" })).toBeNull();
  });

  it("shows the error and loads again on Retry when the request fails", async () => {
    listEmployees.mockImplementationOnce(() => Promise.reject(new ApiError(500, "internal", "Something went wrong")));
    render(<EmployeesPage />);

    expect((await screen.findByRole("alert")).textContent).toContain("Something went wrong");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await screen.findByRole("row", { name: /E00001/ });
    expect(listEmployees).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
