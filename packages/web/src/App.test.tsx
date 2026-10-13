import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
import type { LoginRequest, SessionUser } from "@smt/shared/api-types";

const login = mock<(request: LoginRequest) => Promise<SessionUser>>(() => Promise.resolve({ email: "hr@acme.test" }));
void mock.module("./features/auth/auth.api", () => ({ login }));
const { App } = await import("./App");

describe("App", () => {
  it("shows the login form, then the app shell with the user's email after logging in", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "hr@acme.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "demo-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect((await screen.findByRole("banner")).textContent).toContain("hr@acme.test");
    expect(screen.queryByLabelText("Password")).toBeNull();
  });
});
