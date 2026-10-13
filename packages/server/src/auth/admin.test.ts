import { beforeEach, describe, expect, it } from "bun:test";
import type { Database } from "bun:sqlite";
import { openDatabase } from "../db/connection";
import { ensureAdmin } from "./admin";
import { findByEmail } from "./users.repository";

let db: Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("ensureAdmin", () => {
  it("stores the normalised email with an argon2id hash of the password", async () => {
    await ensureAdmin(db, " HR@Acme.test ", "demo-password");

    const user = findByEmail(db, "hr@acme.test");
    expect(user?.passwordHash).toStartWith("$argon2id$");
    expect(await Bun.password.verify("demo-password", user?.passwordHash ?? "")).toBe(true);
  });

  it("resets the password when run again with a new one", async () => {
    await ensureAdmin(db, "hr@acme.test", "old-password");

    await ensureAdmin(db, "hr@acme.test", "new-password");

    const hash = findByEmail(db, "hr@acme.test")?.passwordHash ?? "";
    expect(await Bun.password.verify("new-password", hash)).toBe(true);
    expect(await Bun.password.verify("old-password", hash)).toBe(false);
  });
});
