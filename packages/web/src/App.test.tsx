import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import type { LoginRequest, SessionUser } from "@smt/shared/api-types";
import { ApiError } from "@/lib/api";

const login = mock<(request: LoginRequest) => Promise<SessionUser>>(() => Promise.resolve({ email: "hr@acme.test" }));
const getMe = mock<() => Promise<SessionUser>>();
void mock.module("./features/auth/auth.api", () => ({ login, getMe }));
const { App } = await import("./App");

const notLoggedIn = () => Promise.reject(new ApiError(401, "unauthenticated", "Please log in"));

beforeEach(() => {
  getMe.mockReset();
  getMe.mockImplementation(notLoggedIn);
});

describe("App", () => {
  it("shows the login form, then the app shell with the user's email after logging in", async () => {
    render(<App />);

    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "hr@acme.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "demo-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect((await screen.findByRole("banner")).textContent).toContain("hr@acme.test");
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("goes straight to the app shell when the session is still valid (e.g. after a reload)", async () => {
    getMe.mockImplementation(() => Promise.resolve({ email: "hr@acme.test" }));

    render(<App />);

    expect((await screen.findByRole("banner")).textContent).toContain("hr@acme.test");
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("shows a loading placeholder while the session is being checked", () => {
    getMe.mockImplementation(() => new Promise<SessionUser>(() => undefined));

    render(<App />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeDefined();
  });
});
