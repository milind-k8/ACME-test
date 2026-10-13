import { describe, expect, it } from "bun:test";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("throws when JWT_SECRET is missing in production", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow("JWT_SECRET is required");
  });

  it("defaults the port to 3000 when PORT is not set", () => {
    expect(loadConfig({}).port).toBe(3000);
  });

  it("reads the port from PORT", () => {
    expect(loadConfig({ PORT: "8080" }).port).toBe(8080);
  });

  it.each(["abc", "0", "65536", "80.5"])("throws when PORT is %p", (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow("PORT must be an integer between 1 and 65535");
  });
});
