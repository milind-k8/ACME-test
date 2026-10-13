import { beforeEach, describe, expect, it } from "bun:test";
import type { Database } from "bun:sqlite";
import { openDatabase } from "../db/connection";
import { findByEmail, upsertUser } from "./users.repository";

let db: Database;

beforeEach(() => {
  db = openDatabase(":memory:");
});

describe("users repository", () => {
  it("finds a user it stored", () => {
    upsertUser(db, "hr@acme.test", "hash-1");

    expect(findByEmail(db, "hr@acme.test")).toEqual({ id: 1, email: "hr@acme.test", passwordHash: "hash-1" });
  });

  it("replaces the password hash when the email already exists", () => {
    upsertUser(db, "hr@acme.test", "hash-1");

    upsertUser(db, "hr@acme.test", "hash-2");

    expect(findByEmail(db, "hr@acme.test")).toEqual({ id: 1, email: "hr@acme.test", passwordHash: "hash-2" });
  });

  it.each(["HR@acme.test", " hr@acme.test", ""])("rejects the stored email %p (must be lowercase, trimmed, non-empty)", (email) => {
    expect(() => {
      upsertUser(db, email, "hash");
    }).toThrow("CHECK constraint failed");
  });
});
