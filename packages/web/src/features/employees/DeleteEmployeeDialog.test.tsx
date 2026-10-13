import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Employee } from "@smt/shared/api-types";
import { DeleteEmployeeDialog } from "./DeleteEmployeeDialog";

const priya: Employee = {
  id: 42,
  employeeNumber: "E00042",
  firstName: "Priya",
  lastName: "Sharma",
  jobTitle: "Software Engineer",
  department: "Engineering",
  country: "IN",
  salaryMinor: 300_000_000,
  currency: "INR",
  hiredAt: "2020-01-15",
};

describe("DeleteEmployeeDialog", () => {
  it("names the employee being deleted", () => {
    render(
      <DeleteEmployeeDialog employee={priya} onConfirm={() => Promise.resolve()} onOpenChange={() => undefined} />,
    );

    expect(screen.getByRole("alertdialog", { name: "Delete Priya Sharma (E00042)?" })).toBeTruthy();
  });

  it("does nothing but close on Cancel", () => {
    const onConfirm = mock(() => Promise.resolve());
    const onOpenChange = mock();
    render(<DeleteEmployeeDialog employee={priya} onConfirm={onConfirm} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("deletes on confirm, with the button disabled while it runs", async () => {
    let finish: () => void = () => undefined;
    const onConfirm = mock(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<DeleteEmployeeDialog employee={priya} onConfirm={onConfirm} onOpenChange={() => undefined} />);

    const confirm = screen.getByRole<HTMLButtonElement>("button", { name: "Delete" });
    fireEvent.click(confirm);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(confirm.disabled).toBe(true);
    });
    finish();
  });
});
