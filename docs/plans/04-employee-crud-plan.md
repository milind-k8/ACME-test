# Plan: Add, edit, and delete employees
Spec: [04-employee-crud-spec.md](../specs/04-employee-crud-spec.md) · Decisions: [ADR-002](../adrs/002-salary-currency-and-usd-reporting.md)

## Slice 1: HR adds a new hire (walking skeleton)

- **Design intent:** reference data in the database, one pure validator that turns a request body into a `NewEmployee` (salary string → minor units), and a create path from the dialog to the table and back.
- **API contract** (`shared/api-types.ts`, `api-routes.ts`):
  ```ts
  export interface EmployeeInput {
    firstName: string; lastName: string; jobTitle: string; department: string;
    country: string; currency: string;
    salary: string;   // major units, e.g. "85000.50"
    hiredAt: string;  // YYYY-MM-DD
  }
  export interface EmployeeFormOptions {
    departments: string[];
    countries: { code: string; currency: string }[];
    currencies: string[];
  }
  // api-routes.ts
  employee: "/api/employees/:id",          // Bun route pattern
  employeeFormOptions: "/api/employees/form-options",
  // plus employeePath(id: number): string for the client
  ```
- **Backend:**
  - Migration `005_reference_data.sql` (schema change):
    ```sql
    CREATE TABLE departments (name TEXT PRIMARY KEY CHECK (length(trim(name)) > 0)) STRICT;
    INSERT INTO departments (name) VALUES ('Data'), ('Engineering'), ('Finance'), ('Marketing'),
      ('People'), ('Product'), ('Sales'), ('Support');

    CREATE TABLE countries (
      code     TEXT PRIMARY KEY CHECK (length(code) = 2 AND code = upper(code)),
      currency TEXT NOT NULL REFERENCES fx_rates(currency)  -- the usual currency, used to pre-fill the form
    ) STRICT;
    INSERT INTO countries (code, currency) VALUES ('BR','BRL'), ('CA','CAD'), ('DE','EUR'), ('ES','EUR'),
      ('GB','GBP'), ('IN','INR'), ('JP','JPY'), ('US','USD');

    -- SQLite can't add a foreign key to an existing column without rebuilding the table (and its FTS
    -- triggers), so membership is enforced with triggers instead.
    CREATE TRIGGER employees_reference_insert BEFORE INSERT ON employees
    WHEN NOT EXISTS (SELECT 1 FROM departments WHERE name = new.department)
      OR NOT EXISTS (SELECT 1 FROM countries WHERE code = new.country)
    BEGIN SELECT RAISE(ABORT, 'unknown department or country'); END;
    CREATE TRIGGER employees_reference_update BEFORE UPDATE OF department, country ON employees
    WHEN ... same ...
    BEGIN SELECT RAISE(ABORT, 'unknown department or country'); END;
    ```
    `seed/data.ts` keeps its own lists; a test checks every seeded department and country exists in these tables.
  - `employees/validate-employee.ts` (pure): `validateEmployee(body: unknown, ref: { departments: Set<string>; countries: Set<string>; currencies: Set<string> }, today: string): { ok: true; value: Omit<NewEmployee, "employeeNumber"> } | { ok: false; errors: Record<string, string> }`. Trims text; collects every error; `parseSalary(text, currency): number | null` uses `Intl.NumberFormat(...).resolvedOptions().maximumFractionDigits` and integer string arithmetic (no `parseFloat`), e.g. `"85000.50"` USD → `8500050`.
  - `employees/employees.repository.ts`: `createEmployee(db, input): Employee` (next number = `max(numeric part) + 1` inside the insert's transaction), `getEmployee(db, id): Employee | null`, `getReferenceData(db): EmployeeFormOptions`.
  - `employees/employees.routes.ts`: `POST /api/employees` → 201. `today` from the injected `now()`.
- **Frontend:**
  - `bunx shadcn add dialog` → `@radix-ui/react-dialog` (strip `cn`/`radix-ui`/`lucide-react` as before; the close icon becomes a local `XIcon`).
  - `components/Toast.tsx`: `Toast({ message, onDone })`, `role="status"`, auto-hides after 4 s (frontend.md lists it as our own component).
  - `features/employees/EmployeeFormDialog.tsx`: `EmployeeFormDialog({ open, employee?, options, onSaved, onOpenChange })`. Plain `<form>`, labelled fields, server errors under each field (`aria-describedby`), Save disabled while saving.
  - `employees.api.ts`: `createEmployee(input)`, `getFormOptions()`.
  - `EmployeesPage`: "Add employee" button (primary) in the page header; after save, toast + reload list and filter options.
- **Libraries added:** `@radix-ui/react-dialog` (pinned exact; on frontend.md's allowed list).
- **Test list:**
  - [x] unit `validate-employee`: valid body → `NewEmployee` without number, salary in minor units · USD `"85000.50"` → `8500050` · JPY `"85000"` → `85000` · JPY `"100.5"` and USD `"100.123"` → salary error · `""`, `"0"`, `"-5"`, `"abc"`, `"1e5"` → salary error · unknown currency, department, country → error each · blank names / title → error each · `2026-02-30`, `"2026-1-5"`, a date after `today` → hiredAt error · several bad fields → all reported · text trimmed
  - [x] integration `employees.repository`: `createEmployee` after the seed's `E10000` → `E10001` · on an empty table → `E00001` · unknown department and unknown country rejected by the triggers · every seeded department and country exists in the reference tables
  - [x] integration `employees.routes`: POST valid → 201 with id and number · invalid → 400 with all `details` · no cookie → 401
  - [x] component `EmployeeFormDialog`: submit sends the typed values · choosing India pre-fills INR · server `details` shown under fields, dialog stays open · Save disabled while pending
  - [x] component `EmployeesPage`: saving shows "Employee added" and reloads the list
- **Quality checks:** no float parsing of salary anywhere · routes contain no SQL · `validate-employee.ts` has no I/O and takes `today` as an argument

## Slice 2: HR edits an employee

- **Design intent:** same validator and dialog; `PUT` keeps the employee number.
- **Backend:** `updateEmployee(db, id, input): Employee | null`; `PUT /api/employees/:id`. `parseId(raw): number | null` (digits only) → 404 otherwise.
- **Frontend:** `EmployeeTable` gets an actions column with "Edit" (`aria-label="Edit Priya Sharma"`); the dialog pre-fills, salary via `formatMajor(minor, currency)` (no grouping, e.g. `85000.50`). `employees.api.ts`: `updateEmployee(id, input)`.
- **Libraries added:** none.
- **Test list:**
  - [ ] integration routes: PUT valid → 200, number unchanged · invalid → 400 · unknown id and `abc` → 404 · renamed employee found by search
  - [ ] unit `lib/format`: `formatMajor(8500050, "USD")` → `"85000.50"` · `formatMajor(85000, "JPY")` → `"85000"`
  - [ ] component: Edit opens the dialog with the row's values · saving shows "Employee updated"

## Slice 3: HR removes someone who has left

- **Backend:** `deleteEmployee(db, id): boolean`; `DELETE /api/employees/:id` → 204 / 404.
- **Frontend:** `bunx shadcn add alert-dialog` → `@radix-ui/react-alert-dialog`. `DeleteEmployeeDialog({ employee, onConfirm, onOpenChange })` with "Delete Priya Sharma (E00042)?". After delete: toast, reload; if the page is now past the end, go back one page.
- **Libraries added:** `@radix-ui/react-alert-dialog` (pinned exact; on the allowed list).
- **Test list:**
  - [ ] integration routes: DELETE → 204, then GET list and search no longer include them · unknown id → 404
  - [ ] component: Delete names the employee · Cancel calls nothing · Confirm calls delete, shows "Employee deleted" · deleting the only row on page 3 moves to page 2

## Slice 4: Choices stay in step with the data

- **Backend:** `GET /api/employees/form-options` → `getReferenceData(db)`. Registered as a static route, so it wins over `/api/employees/:id`.
- **Frontend:** the form's selects come from it; after any save the page refetches filter options too.
- **Test list:**
  - [ ] integration routes: form-options returns sorted departments, countries with currency, currencies · no cookie → 401
  - [ ] integration repository: a direct `UPDATE` to an unknown department is rejected by the trigger
  - [ ] component: a new job title saved through the form appears in the job-title filter after save

## Decision
- **Countries are a fixed list too** (the eight in the seed, each with its usual currency). The form needs a country → currency map to pre-fill, and the spec now says "supported countries". Adding a country is a migration, like departments. Alternative: free ISO codes with no pre-fill.

## As built
_Filled in after the build._

---
- [x] Reviewed
