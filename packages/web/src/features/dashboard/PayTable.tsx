import type { PayStats } from "@smt/shared/api-types";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUsd } from "@/lib/format";
import { PAY_COLUMNS } from "./dashboard.constants";

const count = new Intl.NumberFormat("en-US");
const MONEY: (keyof PayStats)[] = ["payrollUsdCents", "minUsdCents", "medianUsdCents", "avgUsdCents", "maxUsdCents"];

interface PayTableProps<T extends PayStats> {
  caption: string;
  groupLabel: string;
  rows: T[];
  groupOf: (row: T) => string;
  /** Display name for a group key, e.g. a country code → its name. */
  format?: (key: string) => string;
}

export function PayTable<T extends PayStats>({
  caption,
  groupLabel,
  rows,
  groupOf,
  format = (k) => k,
}: PayTableProps<T>) {
  return (
    <div className="rounded-lg border bg-background shadow-xs">
      <Table>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>{groupLabel}</TableHead>
            <TableHead className="text-right">{PAY_COLUMNS.headcount}</TableHead>
            <TableHead className="text-right">{PAY_COLUMNS.payroll}</TableHead>
            <TableHead className="text-right">{PAY_COLUMNS.min}</TableHead>
            <TableHead className="text-right">{PAY_COLUMNS.median}</TableHead>
            <TableHead className="text-right">{PAY_COLUMNS.avg}</TableHead>
            <TableHead className="text-right">{PAY_COLUMNS.max}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={groupOf(row)}>
              <TableCell className="font-medium">{format(groupOf(row))}</TableCell>
              <TableCell className="text-right tabular-nums">{count.format(row.headcount)}</TableCell>
              {MONEY.map((field) => (
                <TableCell key={field} className="text-right tabular-nums">
                  {formatUsd(row[field])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
