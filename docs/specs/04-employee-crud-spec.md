# Spec: Add, edit, and delete employees
Risk: MODERATE
Requirement: [requirements.md → What the HR manager needs to do](../requirements.md#what-the-hr-manager-needs-to-do) (#2) and [Must have](../requirements.md#must-have-mvp) ("Add, edit, and delete an employee, with validation"), money rules in [ADR-002](../adrs/002-salary-currency-and-usd-reporting.md)

## Overview
HR adds a new hire, corrects or updates an employee (most often their salary), and removes someone who has left, from the employee list. The server validates every write and is the authority; the form shows its errors per field.

## Slice 1: HR adds a new hire (walking skeleton)
- [x] `POST /api/employees` with valid fields returns `201` with the stored employee, including its new `id` and `employeeNumber`
- [x] The server assigns the next employee number (`E10001` after `E10000`); the client can't choose it
- [x] The salary is sent in major units as a decimal string (`"85000.50"`) and stored as an integer in minor units (`8500050` for USD, `85000` for JPY)
- [x] A salary with more decimals than the currency allows (`"100.5"` in JPY, `"100.123"` in USD) returns `400` with `details.salary`
- [x] A missing, zero, negative, or non-numeric salary returns `400` with `details.salary`
- [x] A currency not in `fx_rates` returns `400` with `details.currency`
- [x] A blank first name, last name, or job title returns `400` with a message for that field
- [x] A department that isn't one of the fixed departments returns `400` with `details.department`
- [x] A country that isn't one of the supported countries returns `400` with `details.country`
- [x] A hire date that isn't a real `YYYY-MM-DD` date, or is in the future, returns `400` with `details.hiredAt`
- [x] All invalid fields are reported together, not one at a time
- [x] Text fields are trimmed before saving
- [x] Without a session it returns `401`
- [x] An "Add employee" button opens a form dialog; saving it closes the dialog, shows "Employee added", and the new employee appears in the list
- [x] Department, country, and currency are selects; choosing a country pre-fills its usual currency, which HR can still change
- [x] Server field errors appear under each field, and the dialog stays open
- [x] Save is disabled while the request is in flight

## Slice 2: HR edits an employee
- [ ] `PUT /api/employees/:id` with valid fields returns `200` with the updated employee; the employee number is unchanged
- [ ] It applies the same validation as create
- [ ] An unknown or non-numeric `id` returns `404`
- [ ] Each row has an "Edit" action that opens the form filled with that employee's values, salary shown in major units
- [ ] Saving shows "Employee updated" and the row shows the new values
- [ ] The search index follows a changed name

## Slice 3: HR removes someone who has left
- [ ] `DELETE /api/employees/:id` returns `204` and the employee no longer appears in the list or search
- [ ] An unknown `id` returns `404`
- [ ] Each row has a "Delete" action that opens a confirmation naming the employee ("Delete Priya Sharma (E00042)?")
- [ ] Confirming shows "Employee deleted" and removes the row; cancelling changes nothing
- [ ] Deleting the last employee on a page goes back one page

## Slice 4: Choices stay in step with the data
- [ ] `GET /api/employees/form-options` returns the departments, countries (with their usual currency), and currencies (from `fx_rates`), each sorted
- [ ] The form's selects are filled from it
- [ ] The database rejects an employee whose department isn't in the fixed list, even if validation is skipped
- [ ] After a create or edit adds a new job title, the list's filter options include it

## API shape (indicative)
```
POST   /api/employees        EmployeeInput → 201 Employee | 400 { error: { code: "validation", details } }
PUT    /api/employees/:id    EmployeeInput → 200 Employee | 400 | 404
DELETE /api/employees/:id                  → 204 | 404
GET    /api/employees/form-options         → 200 { departments: string[], countries: { code, currency }[], currencies: string[] }
EmployeeInput = { firstName, lastName, jobTitle, department, country, currency, salary: string, hiredAt }
```

## Out of scope
- Salary history or an audit log (requirements → Not doing).
- Bulk edit, bulk delete, and undo.
- Soft delete or archiving: delete removes the row.
- Adding or renaming departments from the UI (a migration does it).
- Excel import/export.
- Editing the FX rates.

## Decisions
- **Departments are a fixed list**, stored in the database so the schema enforces it. Adding a department is a migration. Job titles stay free text.
- **Salary is sent as a decimal string in major units** (`"85000.50"`), so no float reaches the API and the server can reject decimals the currency doesn't have.
- **Delete removes the row.** No soft delete or archive.
- **Future hire dates are rejected.** "Today" comes from the server's injected clock.

---
- [x] Reviewed
