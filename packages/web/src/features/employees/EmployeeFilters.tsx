import type { EmployeeFilterOptions } from "@smt/shared/api-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCountry } from "@/lib/format";
import { FILTER_COPY } from "./employees.constants";

export type FilterName = "country" | "department" | "jobTitle";
export type FilterValues = Partial<Record<FilterName, string>>;

// Radix Select can't use "" as an item value, so "All" gets its own sentinel.
const ALL = "__all__";

interface EmployeeFiltersProps {
  options: EmployeeFilterOptions;
  value: FilterValues;
  onChange: (filter: FilterName, value: string | undefined) => void;
  search: string;
  onSearchChange: (text: string) => void;
}

export function EmployeeFilters({ options, value, onChange, search, onSearchChange }: EmployeeFiltersProps) {
  const fields: { name: FilterName; values: string[]; display?: (v: string) => string }[] = [
    { name: "country", values: options.countries, display: formatCountry },
    { name: "department", values: options.departments },
    { name: "jobTitle", values: options.jobTitles },
  ];
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employee-search">{FILTER_COPY.search.label}</Label>
        <Input
          id="employee-search"
          type="search"
          className="w-64"
          value={search}
          onChange={(event) => {
            onSearchChange(event.target.value);
          }}
        />
      </div>
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
