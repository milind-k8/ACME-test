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

describe("POST /api/logout", () => {
  it("returns 204 and expires the session cookie", async () => {
    const res = await fetch(`${server.url}/api/logout`, { method: "POST", headers: { Cookie: server.loginCookie } });

    expect(res.status).toBe(204);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toStartWith("session=;");
    const attributes = cookie.split(";").slice(1).map((a) => a.trim().toLowerCase()).sort();
    expect(attributes).toEqual(["httponly", "max-age=0", "path=/", "samesite=strict", "secure"]);
  });
});

describe("POST /api/login rate limit", () => {
  const wrong = { email: TEST_ADMIN.email, password: "wrong-password" };
  const right = { email: TEST_ADMIN.email, password: TEST_ADMIN.password };
  const failFiveTimes = async () => {
    for (let i = 0; i < 5; i++) expect((await postLogin(wrong)).status).toBe(401);
  };

  it("refuses the 6th failed attempt in 15 minutes with 429 and Retry-After", async () => {
    await failFiveTimes();

    const res = await postLogin(wrong);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("900");
    expect(await res.json()).toEqual({
      error: { code: "too_many_attempts", message: "Too many login attempts. Try again in 15 minutes." },
    });
  });

  it("refuses even the right password while limited, and sets no cookie", async () => {
    await failFiveTimes();

    const res = await postLogin(right);

    expect(res.status).toBe(429);
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });

  it("lets the client try again after 15 minutes", async () => {
    await failFiveTimes();
    clock = new Date(loginTime.getTime() + 15 * 60_000);

    expect((await postLogin(right)).status).toBe(200);
  });

  it("clears earlier failures after a successful login", async () => {
    for (let i = 0; i < 4; i++) await postLogin(wrong);
    await postLogin(right);

    await failFiveTimes();
  });

  it("doesn't count requests that fail validation", async () => {
    for (let i = 0; i < 10; i++) expect((await postLogin({ email: TEST_ADMIN.email })).status).toBe(400);

    expect((await postLogin(wrong)).status).toBe(401);
  });
});
