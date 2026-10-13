// Page copy for the employee list.
export const EMPLOYEE_COLUMNS = {
  employeeNumber: "No.",
  name: "Name",
  jobTitle: "Job title",
  department: "Department",
  country: "Country",
  salary: "Salary",
  hiredAt: "Hired",
} as const;

export const EMPLOYEE_COPY = {
  loading: "Loading employees",
  retry: "Retry",
} as const;

export const PAGINATION_COPY = {
  showing: (first: string, last: string, total: string) => `Showing ${first}–${last} of ${total}`,
  previous: "Previous",
  next: "Next",
} as const;
