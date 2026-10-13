// Page copy for the employee list.
export const EMPLOYEE_COLUMNS = {
  employeeNumber: "No.",
  name: "Name",
  jobTitle: "Job title",
  department: "Department",
  country: "Country",
  salary: "Salary · sorted in USD",
  hiredAt: "Hired",
  actions: "Actions",
} as const;

type Named = { firstName: string; lastName: string };
export const ROW_ACTIONS = {
  editLabel: "Edit",
  edit: (e: Named) => `Edit ${e.firstName} ${e.lastName}`,
  deleteLabel: "Delete",
  delete: (e: Named) => `Delete ${e.firstName} ${e.lastName}`,
} as const;

export const EMPLOYEE_COPY = {
  title: "Employees",
  subtitle: "Everyone on the payroll, paid in their own currency.",
  loading: "Loading employees",
  retry: "Retry",
  noMatches: "No employees match these filters.",
  clearFilters: "Clear filters",
  added: "Employee added",
  updated: "Employee updated",
  deleted: "Employee deleted",
} as const;

export const PAGINATION_COPY = {
  showing: (first: string, last: string, total: string) => `Showing ${first}–${last} of ${total}`,
  previous: "Previous",
  next: "Next",
} as const;

export const FILTER_COPY = {
  search: { label: "Search by name" },
  country: { label: "Country", all: "All countries" },
  department: { label: "Department", all: "All departments" },
  jobTitle: { label: "Job title", all: "All job titles" },
} as const;

export const FORM_COPY = {
  addTitle: "Add employee",
  editTitle: (e: { firstName: string; lastName: string; employeeNumber: string }) =>
    `Edit ${e.firstName} ${e.lastName} (${e.employeeNumber})`,
  description: "Salary is the annual gross, in the currency the employee is paid in.",
  firstName: "First name",
  lastName: "Last name",
  jobTitle: "Job title",
  department: "Department",
  country: "Country",
  currency: "Currency",
  salary: "Annual salary",
  hiredAt: "Hire date",
  choose: "Choose…",
  cancel: "Cancel",
  save: "Save",
} as const;

export const DELETE_COPY = {
  title: (e: { firstName: string; lastName: string; employeeNumber: string }) =>
    `Delete ${e.firstName} ${e.lastName} (${e.employeeNumber})?`,
  description: "This removes them from the list for good. It can't be undone.",
  cancel: "Cancel",
  confirm: "Delete",
} as const;
