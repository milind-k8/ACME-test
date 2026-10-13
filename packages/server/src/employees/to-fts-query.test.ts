import { describe, expect, it } from "bun:test";
import { toFtsQuery } from "./to-fts-query";

describe("toFtsQuery", () => {
  it("turns each word into a quoted prefix match", () => {
    expect(toFtsQuery(" kri  sha ")).toBe('"kri"* "sha"*');
  });

  it.each(["", "   "])("returns null for blank input %p", (q) => {
    expect(toFtsQuery(q)).toBeNull();
  });

  it("escapes double quotes so input can't break out of the phrase", () => {
    expect(toFtsQuery('a"b')).toBe('"a""b"*');
  });
});
