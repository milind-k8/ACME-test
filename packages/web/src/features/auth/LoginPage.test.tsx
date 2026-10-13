import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { LoginRequest, SessionUser } from "@smt/shared/api-types";
import { ApiError } from "@/lib/api";

const login = mock<(request: LoginRequest) => Promise<SessionUser>>(() => Promise.resolve({ email: "hr@acme.test" }));
void mock.module("./auth.api", () => ({ login }));
const { LoginPage } = await import("./LoginPage");

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Log in" }));
}

beforeEach(() => {
  login.mockClear();
});

describe("LoginPage", () => {
  it("logs in with the typed email and password and hands over the user", async () => {
    const onLoggedIn = mock();
    render(<LoginPage onLoggedIn={onLoggedIn} />);

    fillAndSubmit("hr@acme.test", "demo-password");

    await waitFor(() => {
      expect(onLoggedIn).toHaveBeenCalledWith({ email: "hr@acme.test" });
    });
    expect(login).toHaveBeenCalledWith({ email: "hr@acme.test", password: "demo-password" });
  });

  it("shows the server's message and keeps the typed email when login is rejected", async () => {
    login.mockImplementationOnce(() =>
      Promise.reject(new ApiError(401, "invalid_credentials", "Email or password is incorrect")),
    );
    const onLoggedIn = mock();
    render(<LoginPage onLoggedIn={onLoggedIn} />);

    fillAndSubmit("hr@acme.test", "wrong-password");

    expect((await screen.findByRole("alert")).textContent).toBe("Email or password is incorrect");
    expect(screen.getByLabelText<HTMLInputElement>("Email").value).toBe("hr@acme.test");
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it("disables the submit button while the login request is in flight", async () => {
    let finish: (user: SessionUser) => void = () => undefined;
    login.mockImplementationOnce(() => new Promise<SessionUser>((resolve) => (finish = resolve)));
    render(<LoginPage onLoggedIn={mock()} />);

    fillAndSubmit("hr@acme.test", "demo-password");

    const button = screen.getByRole<HTMLButtonElement>("button", { name: "Logging in…" });
    expect(button.disabled).toBe(true);
    finish({ email: "hr@acme.test" });
    await waitFor(() => {
      expect(screen.getByRole<HTMLButtonElement>("button", { name: "Log in" }).disabled).toBe(false);
    });
  });

  it("shows the rate-limit message when there have been too many attempts", async () => {
    login.mockImplementationOnce(() =>
      Promise.reject(new ApiError(429, "too_many_attempts", "Too many login attempts. Try again in 15 minutes.")),
    );
    render(<LoginPage onLoggedIn={mock()} />);

    fillAndSubmit("hr@acme.test", "wrong-password");

    expect((await screen.findByRole("alert")).textContent).toBe("Too many login attempts. Try again in 15 minutes.");
  });
});
