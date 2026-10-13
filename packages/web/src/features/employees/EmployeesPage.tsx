import { useCallback, useEffect, useState } from "react";
import {
  EMPLOYEE_SORTS,
  type Employee,
  type EmployeeFilterOptions,
  type EmployeeFormOptions,
  type EmployeeInput,
  type EmployeeSort,
  type Page,
} from "@smt/shared/api-types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/Toast";
import { ApiError } from "@/lib/api";
import { useQueryParams } from "@/lib/router";
import { EmployeeFilters, type FilterName } from "./EmployeeFilters";
import { EmployeeFormDialog } from "./EmployeeFormDialog";
import { EmployeeTable } from "./EmployeeTable";
import { createEmployee, getFilterOptions, getFormOptions, listEmployees } from "./employees.api";
import { EMPLOYEE_COPY, FORM_COPY } from "./employees.constants";
import { Pagination } from "./Pagination";

const SKELETON_ROWS = 8;
const SEARCH_DEBOUNCE_MS = 250;
const FILTER_NAMES: FilterName[] = ["country", "department", "jobTitle"];

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; page: Page<Employee> };

export function EmployeesPage() {
  const [params, setParams] = useQueryParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const [options, setOptions] = useState<EmployeeFilterOptions | null>(null);
  const [reloads, setReloads] = useState(0);
  const [formOptions, setFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const hideToast = useCallback(() => {
    setToast(null);
  }, []);
  // A string, so the effect re-runs when the URL changes, not on every render.
  const query = params.toString();
  const urlSearch = params.get("q") ?? "";
  const [search, setSearch] = useState(urlSearch);

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

  useEffect(() => {
    // Typing fires several requests; only the latest one may update the page.
    let current = true;
    setState({ status: "loading" });
    listEmployees(new URLSearchParams(query)).then(
      (page) => {
        if (current) setState({ status: "ready", page });
      },
      (err: unknown) => {
        if (current) fail(err);
      },
    );
    return () => {
      current = false;
    };
  }, [query, reloads, fail]);

  // Reloaded after every save, so a new job title shows up in the filter.
  useEffect(() => {
    getFilterOptions().then(setOptions, fail);
  }, [fail, reloads]);

  useEffect(() => {
    getFormOptions().then(setFormOptions, fail);
  }, [fail]);

  // Errors propagate to the dialog, which shows them per field.
  const addEmployee = async (input: EmployeeInput) => {
    await createEmployee(input);
    setAdding(false);
    setToast(EMPLOYEE_COPY.added);
    setReloads((n) => n + 1);
  };

  // Keep the box in step when the URL changes from elsewhere (Back, Clear filters).
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  // Write the typed text to the URL once typing pauses.
  useEffect(() => {
    if (search.trim() === urlSearch.trim()) return;
    const timer = setTimeout(() => {
      setParams({ q: search.trim() || undefined, page: undefined });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [search, urlSearch, setParams]);

  const filters = Object.fromEntries(FILTER_NAMES.map((name) => [name, params.get(name) ?? undefined]));
  // Any filter change starts again from page 1.
  const setFilter = (name: FilterName, value: string | undefined) => {
    setParams({ [name]: value, page: undefined });
  };
  // Without an explicit sort the server orders a search by best match, so no column is marked then.
  const urlSort = params.get("sort");
  const sort = EMPLOYEE_SORTS.find((s) => s === urlSort) ?? (urlSearch ? undefined : "name");
  const order = params.get("order") === "desc" ? "desc" : "asc";
  // The same column flips direction; a new column starts ascending. Either way, back to page 1.
  const changeSort = (column: EmployeeSort) => {
    const nextOrder = column === sort && order === "asc" ? "desc" : "asc";
    setParams({ sort: column, order: nextOrder, page: undefined });
  };
  const clearFilters = () => {
    setParams(Object.fromEntries([...FILTER_NAMES, "q", "page"].map((name) => [name, undefined])));
  };

  return (
    // Filters and pagination stay put; only the table area scrolls.
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{EMPLOYEE_COPY.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{EMPLOYEE_COPY.subtitle}</p>
        </div>
        <Button
          disabled={!formOptions}
          onClick={() => {
            setAdding(true);
          }}
        >
          {FORM_COPY.addTitle}
        </Button>
      </div>
      {formOptions && (
        // Keyed by open state, so each new form starts empty.
        <EmployeeFormDialog
          key={String(adding)}
          open={adding}
          options={formOptions}
          onOpenChange={setAdding}
          onSubmit={addEmployee}
        />
      )}
      {toast && <Toast message={toast} onDone={hideToast} />}
      {options && (
        <EmployeeFilters
          options={options}
          value={filters}
          onChange={setFilter}
          search={search}
          onSearchChange={setSearch}
        />
      )}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setReloads((n) => n + 1);
            }}
          >
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
          {/* A flex column, so the table container can take the remaining height without a percentage. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background shadow-xs">
            <EmployeeTable employees={state.page.items} sort={sort} order={order} onSort={changeSort} />
            <Pagination
              page={state.page.page}
              pageSize={state.page.pageSize}
              total={state.page.total}
              onPageChange={(next) => {
                setParams({ page: next > 1 ? String(next) : undefined });
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
