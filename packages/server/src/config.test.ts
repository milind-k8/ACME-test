import { describe, expect, it } from "bun:test";
import { loadConfig } from "./config";

const validEnv = { JWT_SECRET: "test-secret", ADMIN_EMAIL: "hr@acme.test", ADMIN_PASSWORD: "demo-password" };

describe("loadConfig", () => {
  it.each(["production", "development", undefined])("throws when JWT_SECRET is missing (NODE_ENV=%p)", (nodeEnv) => {
    expect(() => loadConfig({ NODE_ENV: nodeEnv })).toThrow("JWT_SECRET is required");
  });

  it.each(["ADMIN_EMAIL", "ADMIN_PASSWORD"])("throws when %s is missing", (name) => {
    expect(() => loadConfig({ ...validEnv, [name]: undefined })).toThrow(`${name} is required`);
  });

  it("defaults the port to 3000 when PORT is not set", () => {
    expect(loadConfig(validEnv).port).toBe(3000);
  });

  it("reads the port from PORT", () => {
    expect(loadConfig({ ...validEnv, PORT: "8080" }).port).toBe(8080);
  });

  it.each(["abc", "0", "65536", "80.5"])("throws when PORT is %p", (port) => {
    expect(() => loadConfig({ ...validEnv, PORT: port })).toThrow("PORT must be an integer between 1 and 65535");
  });

  it("defaults the database path to smt.db", () => {
    expect(loadConfig(validEnv).databasePath).toBe("smt.db");
  });

  it("reads the database path from DATABASE_PATH", () => {
    expect(loadConfig({ ...validEnv, DATABASE_PATH: "/data/x.db" }).databasePath).toBe("/data/x.db");
  });
});
