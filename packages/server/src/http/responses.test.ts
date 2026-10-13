import { describe, expect, it, spyOn } from "bun:test";
import { unexpected } from "./responses";

describe("unexpected", () => {
  it("returns a generic 500 that leaks neither the message nor the stack", async () => {
    const log = spyOn(console, "error").mockImplementation(() => undefined);

    const res = unexpected(new Error("SQLITE_ERROR near users: syntax error"));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: "internal", message: "Something went wrong" } });
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});
