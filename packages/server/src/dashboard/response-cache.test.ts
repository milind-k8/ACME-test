import { describe, expect, it } from "bun:test";
import { createResponseCache } from "./response-cache";

describe("createResponseCache", () => {
  it("returns what was stored for the same version and key", () => {
    const cache = createResponseCache<string>(10);
    cache.set("v1", "country=IN", "india");

    expect(cache.get("v1", "country=IN")).toBe("india");
    expect(cache.get("v1", "country=US")).toBeUndefined();
  });

  it("forgets everything when the data version changes", () => {
    const cache = createResponseCache<string>(10);
    cache.set("v1", "a", "old");

    expect(cache.get("v2", "a")).toBeUndefined();
    // Coming back to the old version doesn't resurrect it: the entries were dropped, not hidden.
    expect(cache.get("v1", "a")).toBeUndefined();
  });

  it("evicts the least recently used entry once full", () => {
    const cache = createResponseCache<number>(2);
    cache.set("v", "a", 1);
    cache.set("v", "b", 2);
    cache.get("v", "a"); // "a" is now the most recently used
    cache.set("v", "c", 3);

    expect(cache.get("v", "a")).toBe(1);
    expect(cache.get("v", "b")).toBeUndefined();
    expect(cache.get("v", "c")).toBe(3);
  });
});
