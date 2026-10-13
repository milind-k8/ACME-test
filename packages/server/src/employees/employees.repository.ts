import type { Database } from "bun:sqlite";
import type { Employee, NewEmployee, Page } from "@smt/shared/api-types";
import type { EmployeeListQuery } from "./validate-list-query";

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

export function listEmployees(db: Database, query: EmployeeListQuery): Page<Employee> {
  const items = db
    .query<Employee, [number, number]>(
      `SELECT id, employee_number AS employeeNumber, first_name AS firstName, last_name AS lastName,
              job_title AS jobTitle, department, country, salary_minor AS salaryMinor, currency,
              hired_at AS hiredAt
       FROM employees
       ORDER BY last_name, first_name, id
       LIMIT ? OFFSET ?`,
    )
    .all(query.pageSize, (query.page - 1) * query.pageSize);
  // A separate count, so a page past the end still reports the real total.
  const total = db.query<{ total: number }, []>("SELECT count(*) AS total FROM employees").get()?.total ?? 0;
  return { items, total, page: query.page, pageSize: query.pageSize };
}
