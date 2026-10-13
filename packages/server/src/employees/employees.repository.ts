import type { Database } from "bun:sqlite";
import type { Employee, EmployeeFilterOptions, NewEmployee, Page } from "@smt/shared/api-types";
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

export function listEmployees(db: Database, query: EmployeeListQuery): Page<Employee> {
  const conditions: string[] = [];
  const values: string[] = [];
  for (const filter of EMPLOYEE_FILTERS) {
    const value = query[filter];
    if (value === undefined) continue;
    conditions.push(`${FILTER_COLUMNS[filter]} = ?`);
    values.push(value);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const items = db
    .query<Employee, (string | number)[]>(
      `SELECT id, employee_number AS employeeNumber, first_name AS firstName, last_name AS lastName,
              job_title AS jobTitle, department, country, salary_minor AS salaryMinor, currency,
              hired_at AS hiredAt
       FROM employees
       ${where}
       ORDER BY last_name, first_name, id
       LIMIT ? OFFSET ?`,
    )
    .all(...values, query.pageSize, (query.page - 1) * query.pageSize);
  // A separate count, so a page past the end still reports the real total.
  const total =
    db.query<{ total: number }, string[]>(`SELECT count(*) AS total FROM employees ${where}`).get(...values)?.total ??
    0;
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
