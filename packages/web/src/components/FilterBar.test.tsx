import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import type { EmployeeFilterOptions } from "@smt/shared/api-types";
import { FilterBar } from "./FilterBar";

const options: EmployeeFilterOptions = {
  countries: ["DE", "IN"],
  departments: ["Engineering", "Sales"],
  jobTitles: ["Data Analyst", "Software Engineer"],
};

function choose(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "Enter" });
  fireEvent.click(screen.getByRole("option", { name: option }));
}

describe("FilterBar", () => {
  it("reports the chosen country as its code", () => {
    const onChange = mock();
    render(<FilterBar options={options} value={{}} onChange={onChange} search="" onSearchChange={() => undefined} />);

    choose("Country", "India");

    expect(onChange).toHaveBeenCalledWith("country", "IN");
  });

  it("clears a filter when All is chosen", () => {
    const onChange = mock();
    render(
      <FilterBar
        options={options}
        value={{ department: "Sales" }}
        onChange={onChange}
        search=""
        onSearchChange={() => undefined}
      />,
    );

    choose("Department", "All departments");

    expect(onChange).toHaveBeenCalledWith("department", undefined);
  });

  it("shows the current job title", () => {
    render(
      <FilterBar
        options={options}
        value={{ jobTitle: "Data Analyst" }}
        onChange={() => undefined}
        search=""
        onSearchChange={() => undefined}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Job title" }).textContent).toBe("Data Analyst");
  });
});
