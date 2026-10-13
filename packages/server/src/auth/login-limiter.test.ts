import { describe, expect, it } from "bun:test";
import { createLoginLimiter } from "./login-limiter";

const MINUTE = 60_000;
const limiter = () => createLoginLimiter({ maxFailures: 5, windowMs: 15 * MINUTE, maxClients: 100 });
const at = (minutes: number) => new Date(Date.UTC(2026, 9, 13, 9, 0) + minutes * MINUTE);

describe("createLoginLimiter", () => {
  it("allows 5 failures, then blocks with the seconds left in the window", () => {
    const l = limiter();
    for (let i = 0; i < 5; i++) {
      expect(l.check("a", at(0))).toEqual({ allowed: true });
      l.fail("a", at(0));
    }

    expect(l.check("a", at(0))).toEqual({ allowed: false, retryAfterSeconds: 900 });
    expect(l.check("a", at(10))).toEqual({ allowed: false, retryAfterSeconds: 300 });
  });

  it("allows the client again once the window has passed", () => {
    const l = limiter();
    for (let i = 0; i < 5; i++) l.fail("a", at(0));

    expect(l.check("a", at(15))).toEqual({ allowed: true });
  });

  it("forgets a client's failures after a successful login", () => {
    const l = limiter();
    for (let i = 0; i < 4; i++) l.fail("a", at(0));
    l.succeed("a");
    l.fail("a", at(1));

    expect(l.check("a", at(1))).toEqual({ allowed: true });
  });

  it("keeps clients apart", () => {
    const l = limiter();
    for (let i = 0; i < 5; i++) l.fail("a", at(0));

    expect(l.check("b", at(0))).toEqual({ allowed: true });
  });

  it("doesn't count checks as failures", () => {
    const l = limiter();
    for (let i = 0; i < 20; i++) l.check("a", at(0));

    expect(l.check("a", at(0))).toEqual({ allowed: true });
  });

  it("tracks at most maxClients, dropping the oldest", () => {
    const l = createLoginLimiter({ maxFailures: 1, windowMs: 15 * MINUTE, maxClients: 2 });
    l.fail("a", at(0));
    l.fail("b", at(0));
    l.fail("c", at(0));

    expect(l.check("a", at(0))).toEqual({ allowed: true });
    expect(l.check("b", at(0)).allowed).toBe(false);
    expect(l.check("c", at(0)).allowed).toBe(false);
  });
});
