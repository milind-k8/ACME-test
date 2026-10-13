import { useCallback, useEffect, useState } from "react";
import type { Employee, EmployeeFilterOptions, Page } from "@smt/shared/api-types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";
import { useQueryParams } from "@/lib/router";
import { EmployeeFilters, type FilterName } from "./EmployeeFilters";
import { EmployeeTable } from "./EmployeeTable";
import { getFilterOptions, listEmployees } from "./employees.api";
import { EMPLOYEE_COPY } from "./employees.constants";
import { Pagination } from "./Pagination";

const SKELETON_ROWS = 8;
const FILTER_NAMES: FilterName[] = ["country", "department", "jobTitle"];

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; page: Page<Employee> };

export function EmployeesPage() {
  const [params, setParams] = useQueryParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const [options, setOptions] = useState<EmployeeFilterOptions | null>(null);
  // A string, so the effect re-runs when the URL changes, not on every render.
  const query = params.toString();

  const fail = useCallback((err: unknown) => {
    // Anything that isn't an ApiError is a bug: rethrow inside React so the error boundary reports it.
    if (!(err instanceof ApiError)) {
      setState(() => {
        throw err;
      });
      return;
    }
    setState({ status: "error", message: err.message });
  }, []);

  const load = useCallback(() => {
    setState({ status: "loading" });
    listEmployees(new URLSearchParams(query)).then((page) => {
      setState({ status: "ready", page });
    }, fail);
  }, [query, fail]);

  useEffect(load, [load]);
  useEffect(() => {
    getFilterOptions().then(setOptions, fail);
  }, [fail]);

  const filters = Object.fromEntries(FILTER_NAMES.map((name) => [name, params.get(name) ?? undefined]));
  // Any filter change starts again from page 1.
  const setFilter = (name: FilterName, value: string | undefined) => {
    setParams({ [name]: value, page: undefined });
  };
  const clearFilters = () => {
    setParams(Object.fromEntries([...FILTER_NAMES, "page"].map((name) => [name, undefined])));
  };

  return (
    <div className="flex flex-col gap-4">
      {options && <EmployeeFilters options={options} value={filters} onChange={setFilter} />}
      {state.status === "loading" && (
        <div role="status" aria-label={EMPLOYEE_COPY.loading} className="flex flex-col gap-3">
          {Array.from({ length: SKELETON_ROWS }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      )}
      {state.status === "error" && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{state.message}</span>
          <Button variant="outline" size="sm" onClick={load}>
            {EMPLOYEE_COPY.retry}
          </Button>
        </div>
      )}
      {state.status === "ready" && state.page.total === 0 && (
        <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
          <span>{EMPLOYEE_COPY.noMatches}</span>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            {EMPLOYEE_COPY.clearFilters}
          </Button>
        </div>
      )}
      {state.status === "ready" && state.page.total > 0 && (
        <>
          <EmployeeTable employees={state.page.items} />
          <Pagination
            page={state.page.page}
            pageSize={state.page.pageSize}
            total={state.page.total}
            onPageChange={(next) => {
              setParams({ page: next > 1 ? String(next) : undefined });
            }}
          />
        </>
      )}
    </div>
  );
}
