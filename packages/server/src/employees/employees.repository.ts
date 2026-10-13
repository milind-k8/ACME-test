import type { Database } from "bun:sqlite";
import type { Employee, EmployeeFilterOptions, EmployeeSort, NewEmployee, Page } from "@smt/shared/api-types";
import { toFtsQuery } from "./to-fts-query";
import { EMPLOYEE_FILTERS, type EmployeeFilter, type EmployeeListQuery } from "./validate-list-query";

export function replaceAllEmployees(db: Database, rows: NewEmployee[]): void {
  const insert = db.query(
    `INSERT INTO employees
       (employee_number, first_name, last_name, job_title, department, country, salary_minor, currency, hired_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  db.transaction(() => {
    db.run("DELETE FROM employees");
    for (const e of rows) {
      insert.run(
        e.employeeNumber,
        e.firstName,
        e.lastName,
        e.jobTitle,
        e.department,
        e.country,
        e.salaryMinor,
        e.currency,
        e.hiredAt,
      );
    }
  })();
}

// Column names come only from this fixed map; filter values are always bound as parameters.
const FILTER_COLUMNS: Record<EmployeeFilter, string> = {
  country: "country",
  department: "department",
  jobTitle: "job_title",
};

// ORDER BY expressions come only from this map. Salary compares USD value, since stored amounts are in different currencies.
const SORT_COLUMNS: Record<EmployeeSort, string[]> = {
  name: ["e.last_name", "e.first_name"],
  salary: ["e.salary_minor * fx.usd_cents_per_minor"],
  hiredAt: ["e.hired_at"],
  country: ["e.country"],
};

function orderBy(query: EmployeeListQuery, searching: boolean): string {
  // Unsorted searches come best match first; otherwise alphabetical.
  if (!query.sort && searching) return "bm25(employees_fts), e.id";
  const direction = query.order === "desc" ? "DESC" : "ASC";
  const columns = SORT_COLUMNS[query.sort ?? "name"].map((column) => `${column} ${direction}`);
  // id breaks ties, so equal values keep a stable order across pages.
  return [...columns, "e.id"].join(", ");
}

export function listEmployees(db: Database, query: EmployeeListQuery): Page<Employee> {
  const conditions: string[] = [];
  const values: string[] = [];
  let join = "";
  const match = query.q === undefined ? null : toFtsQuery(query.q);
  if (match) {
    join = "JOIN employees_fts ON employees_fts.rowid = e.id";
    conditions.push("employees_fts MATCH ?");
    values.push(match);
  }
  for (const filter of EMPLOYEE_FILTERS) {
    const value = query[filter];
    if (value === undefined) continue;
    conditions.push(`e.${FILTER_COLUMNS[filter]} = ?`);
    values.push(value);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const fxJoin = query.sort === "salary" ? "JOIN fx_rates fx ON fx.currency = e.currency" : "";

  const items = db
    .query<Employee, (string | number)[]>(
      `SELECT e.id, e.employee_number AS employeeNumber, e.first_name AS firstName, e.last_name AS lastName,
              e.job_title AS jobTitle, e.department, e.country, e.salary_minor AS salaryMinor, e.currency,
              e.hired_at AS hiredAt
       FROM employees e
       ${join}
       ${fxJoin}
       ${where}
       ORDER BY ${orderBy(query, match !== null)}
       LIMIT ? OFFSET ?`,
    )
    .all(...values, query.pageSize, (query.page - 1) * query.pageSize);
  // A separate count, so a page past the end still reports the real total.
  const total =
    db.query<{ total: number }, string[]>(`SELECT count(*) AS total FROM employees e ${join} ${where}`).get(...values)
      ?.total ?? 0;
  return { items, total, page: query.page, pageSize: query.pageSize };
}

export function listFilterOptions(db: Database): EmployeeFilterOptions {
  // Each DISTINCT reads its column from an index, so none of these touches the table rows.
  const distinct = (column: string) =>
    db
      .query<{ value: string }, []>(`SELECT DISTINCT ${column} AS value FROM employees ORDER BY value`)
      .all()
      .map((row) => row.value);
  return { countries: distinct("country"), departments: distinct("department"), jobTitles: distinct("job_title") };
}
