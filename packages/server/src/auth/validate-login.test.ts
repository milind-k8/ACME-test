import { describe, expect, it } from "bun:test";
import { validateLogin } from "./validate-login";

describe("validateLogin", () => {
  it("accepts an email and password, trimming and lowercasing the email", () => {
    expect(validateLogin({ email: "  HR@Acme.test ", password: " secret " })).toEqual({
      ok: true,
      value: { email: "hr@acme.test", password: " secret " },
    });
  });

  it.each([
    ["email is missing", { password: "secret" }, { email: "is required" }],
    ["email is blank", { email: "   ", password: "secret" }, { email: "is required" }],
    ["email is not a string", { email: 42, password: "secret" }, { email: "is required" }],
    ["password is missing", { email: "hr@acme.test" }, { password: "is required" }],
    ["password is empty", { email: "hr@acme.test", password: "" }, { password: "is required" }],
    ["both are missing", {}, { email: "is required", password: "is required" }],
  ])("rejects the body when %s", (_case, body, errors) => {
    expect(validateLogin(body)).toEqual({ ok: false, errors });
  });

  it.each([null, "hr@acme.test", ["hr@acme.test", "secret"], 42])("rejects a body that is not an object: %p", (body) => {
    expect(validateLogin(body)).toEqual({ ok: false, errors: { email: "is required", password: "is required" } });
  });
});
