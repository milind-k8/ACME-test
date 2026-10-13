import { afterEach, describe, expect, it, mock } from "bun:test";
import { api, ApiError } from "./api";

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
});
