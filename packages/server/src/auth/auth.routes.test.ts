import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { startTestServer, TEST_ADMIN } from "../test-support/test-server";

const loginTime = new Date("2026-10-13T09:00:00Z");
let clock: Date;
let server: Awaited<ReturnType<typeof startTestServer>>;

beforeEach(async () => {
  clock = loginTime;
  server = await startTestServer({ now: () => clock });
});

afterEach(async () => {
  await server.stop();
});

function postLogin(body: unknown): Promise<Response> {
  return fetch(`${server.url}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const invalidCredentials = {
  error: { code: "invalid_credentials", message: "Email or password is incorrect" },
};

describe("POST /api/login", () => {
  it("returns 200 with the email for the correct credentials", async () => {
    const res = await postLogin(TEST_ADMIN);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: TEST_ADMIN.email });
  });

  it("returns 401 and sets no cookie for a wrong password", async () => {
    const res = await postLogin({ email: TEST_ADMIN.email, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual(invalidCredentials);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("returns the same 401 for an unknown email as for a wrong password", async () => {
    const res = await postLogin({ email: "nobody@acme.test", password: TEST_ADMIN.password });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual(invalidCredentials);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("sets an httpOnly, Secure, SameSite=Strict session cookie that lasts 8 hours", async () => {
    const res = await postLogin(TEST_ADMIN);

    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^session=[\w-]+\.[\w-]+\.[\w-]+;/);
    const attributes = cookie.split(";").slice(1).map((a) => a.trim().toLowerCase()).sort();
    expect(attributes).toEqual(["httponly", "max-age=28800", "path=/", "samesite=strict", "secure"]);
  });

  it("returns 400 with a message per field when email or password is missing", async () => {
    const res = await postLogin({ email: "hr@acme.test" });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: "validation", message: "Invalid login request", details: { password: "is required" } },
    });
  });

  it("returns 400 when the body is not valid JSON", async () => {
    const res = await fetch(`${server.url}/api/login`, { method: "POST", body: "{not json" });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: {
        code: "validation",
        message: "Invalid login request",
        details: { email: "is required", password: "is required" },
      },
    });
  });

  it("logs in regardless of email letter case and surrounding spaces", async () => {
    const res = await postLogin({ email: "  HR@Acme.TEST ", password: TEST_ADMIN.password });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: TEST_ADMIN.email });
  });
});

describe("GET /api/me", () => {
  it("returns 200 with the email for a valid session cookie", async () => {
    const res = await fetch(`${server.url}/api/me`, { headers: { Cookie: server.loginCookie } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: TEST_ADMIN.email });
  });

  const unauthenticated = { error: { code: "unauthenticated", message: "Please log in" } };

  it("returns 401 without a session cookie", async () => {
    const res = await fetch(`${server.url}/api/me`);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual(unauthenticated);
  });

  it("returns 401 for a tampered session cookie", async () => {
    const res = await fetch(`${server.url}/api/me`, { headers: { Cookie: `${server.loginCookie}x` } });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual(unauthenticated);
  });

  it("returns 401 once the session is more than 8 hours old", async () => {
    clock = new Date(loginTime.getTime() + (8 * 60 * 60 + 1) * 1000);

    const res = await fetch(`${server.url}/api/me`, { headers: { Cookie: server.loginCookie } });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual(unauthenticated);
  });
});
