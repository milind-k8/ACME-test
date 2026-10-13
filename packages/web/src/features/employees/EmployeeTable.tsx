import type { Employee, EmployeeSort, SortOrder } from "@smt/shared/api-types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCountry, formatMoney } from "@/lib/format";
import { EMPLOYEE_COLUMNS } from "./employees.constants";

const HEAD = "text-xs font-medium tracking-wide text-muted-foreground uppercase";

interface EmployeeTableProps {
  employees: Employee[];
  /** Undefined when no column is the sort, e.g. search results in best-match order. */
  sort: EmployeeSort | undefined;
  order: SortOrder;
  onSort: (sort: EmployeeSort) => void;
}

export function EmployeeTable({ employees, sort, order, onSort }: EmployeeTableProps) {
  const sortable = (column: EmployeeSort, label: string, className?: string) => (
    <TableHead
      className={cn(HEAD, className)}
      aria-sort={sort !== column ? "none" : order === "asc" ? "ascending" : "descending"}
    >
      <button
        type="button"
        className={cn("inline-flex items-center gap-1 uppercase hover:text-foreground", className)}
        onClick={() => {
          onSort(column);
        }}
      >
        {label}
        <span aria-hidden="true" className="w-3 text-muted-foreground">
          {sort === column ? (order === "asc" ? "↑" : "↓") : ""}
        </span>
      </button>
    </TableHead>
  );

  return (
    <Table containerClassName="min-h-0 flex-1 overflow-y-auto">
      <TableHeader className="sticky top-0 z-10 bg-muted shadow-xs">
        <TableRow>
          <TableHead className={HEAD}>{EMPLOYEE_COLUMNS.employeeNumber}</TableHead>
          {sortable("name", EMPLOYEE_COLUMNS.name)}
          <TableHead className={HEAD}>{EMPLOYEE_COLUMNS.jobTitle}</TableHead>
          <TableHead className={HEAD}>{EMPLOYEE_COLUMNS.department}</TableHead>
          {sortable("country", EMPLOYEE_COLUMNS.country)}
          {sortable("salary", EMPLOYEE_COLUMNS.salary, "text-right")}
          {sortable("hiredAt", EMPLOYEE_COLUMNS.hiredAt)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-mono text-xs text-muted-foreground">{e.employeeNumber}</TableCell>
            <TableCell className="font-medium">{`${e.firstName} ${e.lastName}`}</TableCell>
            <TableCell>{e.jobTitle}</TableCell>
            <TableCell>
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{e.department}</span>
            </TableCell>
            <TableCell>{formatCountry(e.country)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(e.salaryMinor, e.currency)}</TableCell>
            <TableCell className="tabular-nums">{e.hiredAt}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
