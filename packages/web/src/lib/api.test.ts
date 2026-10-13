import { afterEach, describe, expect, it, mock } from "bun:test";
import { api, ApiError, onUnauthorized } from "./api";

const realFetch = globalThis.fetch;

function stubFetch(response: Response) {
  const fetchMock = mock(() => Promise.resolve(response));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("api", () => {
  it("throws an ApiError carrying the status, code, message and details of an error response", async () => {
    stubFetch(
      Response.json(
        { error: { code: "validation", message: "Invalid login request", details: { password: "is required" } } },
        { status: 400 },
      ),
    );

    const err = await api("/api/login").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 400,
      code: "validation",
      message: "Invalid login request",
      details: { password: "is required" },
    });
  });

  it("throws an ApiError with a generic message when the error body is not ours (e.g. a proxy 502 page)", async () => {
    stubFetch(new Response("<html>Bad Gateway</html>", { status: 502 }));

    const err = await api("/api/login").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 502, code: "unknown", message: "Something went wrong. Please try again." });
  });

  it("throws an ApiError with status 0 when the request never reaches the server", async () => {
    globalThis.fetch = mock(() => Promise.reject(new TypeError("Failed to fetch"))) as unknown as typeof fetch;

    const err = await api("/api/login").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, code: "network", message: "Can't reach the server. Check your connection." });
  });

  it("sends JSON with same-origin credentials and returns the parsed body", async () => {
    const fetchMock = stubFetch(Response.json({ email: "hr@acme.test" }));

    const result = await api("/api/login", { method: "POST", body: "{}" });

    expect(result).toEqual({ email: "hr@acme.test" });
    expect(fetchMock).toHaveBeenCalledWith("/api/login", {
      method: "POST",
      body: "{}",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("resolves to undefined for a 204 No Content response", async () => {
    stubFetch(new Response(null, { status: 204 }));

    const result: unknown = await api("/api/logout", { method: "POST" });
    expect(result).toBeUndefined();
  });
});

describe("onUnauthorized", () => {
  const unauthenticated = () =>
    Response.json({ error: { code: "unauthenticated", message: "Please log in" } }, { status: 401 });

  it("notifies listeners when any API call is answered with 401", async () => {
    const listener = mock();
    const unsubscribe = onUnauthorized(listener);
    stubFetch(unauthenticated());

    await api("/api/employees").catch(() => undefined);

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("does not notify for a 401 from /api/login (that is a wrong password, not an expired session)", async () => {
    const listener = mock();
    const unsubscribe = onUnauthorized(listener);
    stubFetch(Response.json({ error: { code: "invalid_credentials", message: "Email or password is incorrect" } }, { status: 401 }));

    await api("/api/login").catch(() => undefined);

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("stops notifying after unsubscribe", async () => {
    const listener = mock();
    onUnauthorized(listener)();
    stubFetch(unauthenticated());

    await api("/api/employees").catch(() => undefined);

    expect(listener).not.toHaveBeenCalled();
  });
});
