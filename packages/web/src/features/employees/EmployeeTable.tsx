import type { Employee } from "@smt/shared/api-types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCountry, formatMoney } from "@/lib/format";
import { EMPLOYEE_COLUMNS } from "./employees.constants";

export function EmployeeTable({ employees }: { employees: Employee[] }) {
  return (
    <Table>
      <TableHeader className="sticky top-0 bg-background">
        <TableRow>
          <TableHead>{EMPLOYEE_COLUMNS.employeeNumber}</TableHead>
          <TableHead>{EMPLOYEE_COLUMNS.name}</TableHead>
          <TableHead>{EMPLOYEE_COLUMNS.jobTitle}</TableHead>
          <TableHead>{EMPLOYEE_COLUMNS.department}</TableHead>
          <TableHead>{EMPLOYEE_COLUMNS.country}</TableHead>
          <TableHead className="text-right">{EMPLOYEE_COLUMNS.salary}</TableHead>
          <TableHead>{EMPLOYEE_COLUMNS.hiredAt}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="tabular-nums">{e.employeeNumber}</TableCell>
            <TableCell>{`${e.firstName} ${e.lastName}`}</TableCell>
            <TableCell>{e.jobTitle}</TableCell>
            <TableCell>{e.department}</TableCell>
            <TableCell>{formatCountry(e.country)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(e.salaryMinor, e.currency)}</TableCell>
            <TableCell className="tabular-nums">{e.hiredAt}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
