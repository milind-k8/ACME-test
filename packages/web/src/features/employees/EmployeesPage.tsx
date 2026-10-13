import { useCallback, useEffect, useState } from "react";
import type { Employee, Page } from "@smt/shared/api-types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useQueryParams } from "@/lib/router";
import { EmployeeTable } from "./EmployeeTable";
import { listEmployees } from "./employees.api";
import { EMPLOYEE_COPY } from "./employees.constants";
import { Pagination } from "./Pagination";

const SKELETON_ROWS = 8;

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; page: Page<Employee> };

export function EmployeesPage() {
  const [params, setParams] = useQueryParams();
  const [state, setState] = useState<State>({ status: "loading" });
  // A string, so the effect re-runs when the URL changes, not on every render.
  const query = params.toString();

  const load = useCallback(() => {
    setState({ status: "loading" });
    listEmployees(new URLSearchParams(query)).then(
      (page) => {
        setState({ status: "ready", page });
      },
      (err: unknown) => {
        // Anything that isn't an ApiError is a bug: rethrow inside React so the error boundary reports it.
        if (!(err instanceof ApiError)) {
          setState(() => {
            throw err;
          });
          return;
        }
        setState({ status: "error", message: err.message });
      },
    );
  }, [query]);

  useEffect(load, [load]);

  if (state.status === "loading") {
    return (
      <div role="status" aria-label={EMPLOYEE_COPY.loading} className="flex flex-col gap-3">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        <span>{state.message}</span>
        <Button variant="outline" size="sm" onClick={load}>
          {EMPLOYEE_COPY.retry}
        </Button>
      </div>
    );
  }
  const { items, page, pageSize, total } = state.page;
  return (
    <>
      <EmployeeTable employees={items} />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(next) => {
          setParams({ page: next > 1 ? String(next) : undefined });
        }}
      />
    </>
  );
}
