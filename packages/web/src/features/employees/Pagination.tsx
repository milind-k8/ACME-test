import { Button } from "@/components/ui/button";
import { PAGINATION_COPY } from "./employees.constants";

const count = new Intl.NumberFormat("en-US");

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const first = Math.min((page - 1) * pageSize + 1, total);
  const last = Math.min(page * pageSize, total);
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-t px-4 py-3 text-sm">
      <span className="text-muted-foreground tabular-nums">
        {PAGINATION_COPY.showing(count.format(first), count.format(last), count.format(total))}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          {PAGINATION_COPY.previous}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={last >= total}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          {PAGINATION_COPY.next}
        </Button>
      </div>
    </div>
  );
}
