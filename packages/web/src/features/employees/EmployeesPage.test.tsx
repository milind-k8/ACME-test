import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { Employee, EmployeeFilterOptions, Page } from "@smt/shared/api-types";
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

const listEmployees = mock<(params: URLSearchParams) => Promise<Page<Employee>>>(() => Promise.resolve(page([priya])));
const getFilterOptions = mock<() => Promise<EmployeeFilterOptions>>(() =>
  Promise.resolve({ countries: ["DE", "IN"], departments: ["Engineering"], jobTitles: ["Software Engineer"] }),
);
void mock.module("./employees.api", () => ({ listEmployees, getFilterOptions }));
const { EmployeesPage } = await import("./EmployeesPage");

const requestedPages = () => listEmployees.mock.calls.map(([params]) => params.get("page"));

beforeEach(() => {
  listEmployees.mockClear();
  listEmployees.mockImplementation(() => Promise.resolve(page([priya])));
  window.history.replaceState(null, "", "/");
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

  it("loads the next page and puts it in the URL when Next is clicked", async () => {
    listEmployees.mockImplementation(() => Promise.resolve({ items: [priya], total: 120, page: 1, pageSize: 50 }));
    render(<EmployeesPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(requestedPages()).toEqual([null, "2"]);
    });
    expect(window.location.search).toBe("?page=2");
  });

  it("loads the page named in the URL, so a reload keeps the page", async () => {
    window.history.replaceState(null, "", "/?page=3");

    render(<EmployeesPage />);

    await screen.findByRole("row", { name: /E00001/ });
    expect(requestedPages()).toEqual(["3"]);
  });

  it("filters by the chosen country, back on page 1, with the filter in the URL", async () => {
    window.history.replaceState(null, "", "/?page=3");
    render(<EmployeesPage />);

    fireEvent.keyDown(await screen.findByRole("combobox", { name: "Country" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("option", { name: "India" }));

    await waitFor(() => {
      expect(window.location.search).toBe("?country=IN");
    });
    const last = listEmployees.mock.calls.at(-1)?.[0];
    expect(last?.get("country")).toBe("IN");
    expect(last?.get("page")).toBeNull();
  });

  it("applies the filters in the URL on load, so a shared link shows the same list", async () => {
    window.history.replaceState(null, "", "/?department=Engineering");

    render(<EmployeesPage />);

    await screen.findByRole("row", { name: /E00001/ });
    expect(listEmployees.mock.calls[0]?.[0].get("department")).toBe("Engineering");
    expect(screen.getByRole("combobox", { name: "Department" }).textContent).toBe("Engineering");
  });

  it("says when nothing matches and clears the filters on request", async () => {
    window.history.replaceState(null, "", "/?country=DE&jobTitle=Software+Engineer");
    listEmployees.mockImplementationOnce(() => Promise.resolve(page([])));
    render(<EmployeesPage />);

    expect(await screen.findByText("No employees match these filters.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    await waitFor(() => {
      expect(window.location.search).toBe("");
    });
    await screen.findByRole("row", { name: /E00001/ });
  });
});
