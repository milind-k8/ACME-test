import type { EmployeeFilter, EmployeeFilterOptions, EmployeeFilters } from "@smt/shared/api-types";
import { SearchIcon } from "@/components/icons/SearchIcon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCountry } from "@/lib/format";

// Copy for the filter bar, shared by the Employees and Dashboard pages.
export const FILTER_COPY = {
  search: { label: "Search by name" },
  country: { label: "Country", all: "All countries" },
  department: { label: "Department", all: "All departments" },
  jobTitle: { label: "Job title", all: "All job titles" },
} as const;

// Radix Select can't use "" as an item value, so "All" gets its own sentinel.
const ALL = "__all__";

interface FilterBarProps {
  options: EmployeeFilterOptions;
  value: EmployeeFilters;
  onChange: (filter: EmployeeFilter, value: string | undefined) => void;
  /** Name search is shown only when both are given (the Employees page). */
  search?: string;
  onSearchChange?: (text: string) => void;
}

export function FilterBar({ options, value, onChange, search, onSearchChange }: FilterBarProps) {
  const fields: { name: EmployeeFilter; values: string[]; display?: (v: string) => string }[] = [
    { name: "country", values: options.countries, display: formatCountry },
    { name: "department", values: options.departments },
    { name: "jobTitle", values: options.jobTitles },
  ];
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-background p-4 shadow-xs">
      {onSearchChange && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employee-search">{FILTER_COPY.search.label}</Label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="employee-search"
              type="search"
              className="w-64 pl-9"
              value={search ?? ""}
              onChange={(event) => {
                onSearchChange(event.target.value);
              }}
            />
          </div>
        </div>
      )}
      {fields.map(({ name, values, display = (v) => v }) => {
        const id = `filter-${name}`;
        return (
          <div key={name} className="flex flex-col gap-1.5">
            <Label htmlFor={id}>{FILTER_COPY[name].label}</Label>
            <Select
              value={value[name] ?? ALL}
              onValueChange={(next) => {
                onChange(name, next === ALL ? undefined : next);
              }}
            >
              <SelectTrigger id={id} className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{FILTER_COPY[name].all}</SelectItem>
                {values.map((v) => (
                  <SelectItem key={v} value={v}>
                    {display(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
