import { describe, expect, it } from "bun:test";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("throws when JWT_SECRET is missing in production", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow("JWT_SECRET is required");
  });

  it("defaults the port to 3000 when PORT is not set", () => {
    expect(loadConfig({}).port).toBe(3000);
  });
});
