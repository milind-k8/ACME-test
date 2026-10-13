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
