import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { Employee, LoginRequest, Page, SessionUser } from "@smt/shared/api-types";
import { api, ApiError } from "@/lib/api";

const login = mock<(request: LoginRequest) => Promise<SessionUser>>(() => Promise.resolve({ email: "hr@acme.test" }));
const getMe = mock<() => Promise<SessionUser>>();
const logout = mock<() => Promise<void>>(() => Promise.resolve());
void mock.module("./features/auth/auth.api", () => ({ login, getMe, logout }));
const employee: Employee = {
  id: 1,
  employeeNumber: "E00001",
  firstName: "Priya",
  lastName: "Sharma",
  jobTitle: "Software Engineer",
  department: "Engineering",
  country: "IN",
  salaryMinor: 300_000_000,
  currency: "INR",
  hiredAt: "2020-01-15",
};
const listEmployees = mock<() => Promise<Page<Employee>>>(() =>
  Promise.resolve({ items: [employee], total: 1, page: 1, pageSize: 50 }),
);
const getFilterOptions = mock(() => Promise.resolve({ countries: [], departments: [], jobTitles: [] }));
const getFormOptions = mock(() => Promise.resolve({ departments: [], countries: [], currencies: [] }));
const createEmployee = mock(() => Promise.resolve(employee));
void mock.module("./features/employees/employees.api", () => ({
  listEmployees,
  getFilterOptions,
  getFormOptions,
  createEmployee,
}));
const { App } = await import("./App");

// The email and Log out live in a menu behind the user's initial in the header.
async function openAccountMenu() {
  fireEvent.keyDown(await screen.findByRole("button", { name: "Account menu" }), { key: "Enter" });
  return screen.findByRole("menu");
}

const notLoggedIn = () => Promise.reject(new ApiError(401, "unauthenticated", "Please log in"));

const realFetch = globalThis.fetch;
const loggedIn = () => Promise.resolve({ email: "hr@acme.test" });

beforeEach(() => {
  getMe.mockReset();
  getMe.mockImplementation(notLoggedIn);
  logout.mockClear();
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("App", () => {
  it("shows the login form, then the app shell with the user's email after logging in", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "hr@acme.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "demo-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect((await openAccountMenu()).textContent).toContain("hr@acme.test");
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("goes straight to the app shell when the session is still valid (e.g. after a reload)", async () => {
    getMe.mockImplementation(() => Promise.resolve({ email: "hr@acme.test" }));

    render(<App />);

    expect((await openAccountMenu()).textContent).toContain("hr@acme.test");
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("shows the employee list, with Employees in the navigation, once logged in", async () => {
    getMe.mockImplementation(loggedIn);

    render(<App />);

    const nav = await screen.findByRole("navigation");
    expect(within(nav).getByText("Employees")).toBeDefined();
    expect(await screen.findByRole("table")).toBeDefined();
    expect(listEmployees).toHaveBeenCalled();
  });

  it("shows a loading placeholder while the session is being checked", () => {
    getMe.mockImplementation(() => new Promise<SessionUser>(() => undefined));

    render(<App />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeDefined();
  });

  it("logs out from the account menu and returns to the login form", async () => {
    getMe.mockImplementation(loggedIn);
    render(<App />);

    fireEvent.click(within(await openAccountMenu()).getByRole("menuitem", { name: "Log out" }));

    expect(await screen.findByLabelText("Password")).toBeDefined();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("returns to the login form when any API call reports the session has expired", async () => {
    getMe.mockImplementation(loggedIn);
    render(<App />);
    await screen.findByRole("banner");
    globalThis.fetch = mock(() =>
      Promise.resolve(Response.json({ error: { code: "unauthenticated", message: "Please log in" } }, { status: 401 })),
    ) as unknown as typeof fetch;

    await api("/api/employees").catch(() => undefined);

    expect(await screen.findByLabelText("Password")).toBeDefined();
  });
});
