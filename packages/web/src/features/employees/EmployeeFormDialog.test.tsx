import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Employee, EmployeeFormOptions, EmployeeInput } from "@smt/shared/api-types";
import { ApiError } from "@/lib/api";
import { EmployeeFormDialog } from "./EmployeeFormDialog";

const options: EmployeeFormOptions = {
  departments: ["Data", "Engineering"],
  countries: [
    { code: "IN", currency: "INR" },
    { code: "US", currency: "USD" },
  ],
  currencies: ["INR", "USD"],
};

function renderDialog(onSubmit: (input: EmployeeInput) => Promise<void>) {
  render(<EmployeeFormDialog open options={options} onOpenChange={() => undefined} onSubmit={onSubmit} />);
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function choose(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "Enter" });
  fireEvent.click(screen.getByRole("option", { name: option }));
}

function fillValidForm() {
  type("First name", "Aarav");
  type("Last name", "Mishra");
  type("Job title", "Data Analyst");
  choose("Department", "Data");
  choose("Country", "India");
  type("Annual salary", "1850000.50");
  type("Hire date", "2026-10-01");
}

const save = () => screen.getByRole<HTMLButtonElement>("button", { name: "Save" });

describe("EmployeeFormDialog", () => {
  it("submits what HR entered", async () => {
    const onSubmit = mock(() => Promise.resolve());
    renderDialog(onSubmit);

    fillValidForm();
    fireEvent.click(save());

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        firstName: "Aarav",
        lastName: "Mishra",
        jobTitle: "Data Analyst",
        department: "Data",
        country: "IN",
        currency: "INR",
        salary: "1850000.50",
        hiredAt: "2026-10-01",
      });
    });
  });

  it("pre-fills the country's usual currency, which can still be changed", () => {
    renderDialog(() => Promise.resolve());

    choose("Country", "India");
    expect(screen.getByRole("combobox", { name: "Currency" }).textContent).toBe("INR");

    choose("Currency", "USD");
    expect(screen.getByRole("combobox", { name: "Currency" }).textContent).toBe("USD");
  });

  it("shows the server's message under each bad field and stays open", async () => {
    renderDialog(() =>
      Promise.reject(
        new ApiError(400, "validation", "Some employee details are invalid", {
          salary: "must be a positive amount with at most 2 decimals",
          hiredAt: "can't be in the future",
        }),
      ),
    );

    fillValidForm();
    fireEvent.click(save());

    expect(await screen.findByText("must be a positive amount with at most 2 decimals")).toBeTruthy();
    expect(screen.getByLabelText("Annual salary").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("can't be in the future")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("disables Save while saving", async () => {
    let finish: () => void = () => undefined;
    renderDialog(() => new Promise<void>((resolve) => (finish = resolve)));

    fillValidForm();
    fireEvent.click(save());

    await waitFor(() => {
      expect(save().disabled).toBe(true);
    });
    finish();
    await waitFor(() => {
      expect(save().disabled).toBe(false);
    });
  });

  it("opens filled with an employee's details when editing, salary in major units", () => {
    const priya: Employee = {
      id: 7,
      employeeNumber: "E00007",
      firstName: "Priya",
      lastName: "Sharma",
      jobTitle: "Software Engineer",
      department: "Engineering",
      country: "IN",
      salaryMinor: 300_000_050,
      currency: "INR",
      hiredAt: "2020-01-15",
    };
    render(
      <EmployeeFormDialog
        open
        employee={priya}
        options={options}
        onOpenChange={() => undefined}
        onSubmit={() => Promise.resolve()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Edit Priya Sharma (E00007)" })).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>("First name").value).toBe("Priya");
    expect(screen.getByLabelText<HTMLInputElement>("Annual salary").value).toBe("3000000.50");
    expect(screen.getByLabelText<HTMLInputElement>("Hire date").value).toBe("2020-01-15");
    expect(screen.getByRole("combobox", { name: "Department" }).textContent).toBe("Engineering");
    expect(screen.getByRole("combobox", { name: "Currency" }).textContent).toBe("INR");
  });
});
